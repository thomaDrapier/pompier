import { useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { LigneGrade } from '@/data/conversions'
import type { SaisieGrade } from '@/data/requetes-referentiel'
import {
  BoutonsFormulaire,
  ChampTexte,
  Confirmation,
  EtatLecture,
  MessageErreur,
  MessageReussite,
  Section,
} from '@/features/admin/communs'
import { MESSAGES, messageErreur } from '@/features/admin/messages'
import { lireSaisieGrade } from '@/features/admin/regles-admin'
import type { ChampGrade, ChampsGrade } from '@/features/admin/regles-admin'
import {
  useChangerActifGrade,
  useCreerGrade,
  useGrades,
  useModifierGrade,
  useSupprimerGrade,
} from '@/hooks/useAdministrationReferentiel'
import { useEnLigne } from '@/hooks/useEnLigne'

// Administration › Grades — /admin/grades (spécifications 6.2).
// Liste : grades actifs par ordre hiérarchique, puis grades archivés
// (ordre de lecture de useGrades). Archiver et réactiver se font sans
// confirmation (aucun effet sur le calcul, D-018) ; la suppression est
// toujours proposée, avec confirmation, et la base la refuse pour un grade
// qui a déjà servi.
export function GradesScreen() {
  const grades = useGrades()
  const creer = useCreerGrade()
  const modifier = useModifierGrade()
  const changerActif = useChangerActifGrade()
  const supprimer = useSupprimerGrade()
  const enLigne = useEnLigne()

  const [ajout, setAjout] = useState(false)
  const [enModification, setEnModification] = useState<string | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState<LigneGrade | null>(null)

  /** Début d'une nouvelle action : les messages précédents disparaissent. */
  function effacerMessages() {
    setReussite(null)
    setErreur(null)
  }

  async function ajouter(saisie: SaisieGrade) {
    await creer.mutateAsync(saisie)
    setAjout(false)
    setReussite(MESSAGES.gradeAjoute)
  }

  async function enregistrerModification(id: string, saisie: SaisieGrade) {
    await modifier.mutateAsync({ id, saisie })
    setEnModification(null)
    setReussite(MESSAGES.gradeModifie)
  }

  async function basculerActif(grade: LigneGrade) {
    effacerMessages()
    if (!enLigne) {
      setErreur(MESSAGES.horsLigne)
      return
    }
    try {
      await changerActif.mutateAsync({ id: grade.id, actif: !grade.actif })
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  async function confirmerSuppression() {
    const grade = aSupprimer
    setASupprimer(null)
    if (grade === null) return
    if (!enLigne) {
      setErreur(MESSAGES.horsLigne)
      return
    }
    try {
      await supprimer.mutateAsync(grade.id)
      setReussite(MESSAGES.gradeSupprime)
    } catch (e) {
      setErreur(messageErreur(e, 'grade'))
    }
  }

  return (
    <Section titre="Grades">
      <MessageReussite message={reussite} />
      <MessageErreur message={erreur} />

      {ajout ? (
        <FormulaireGrade
          titre="Nouveau grade"
          initial={{ libelle: '', ordre: '' }}
          onEnregistrer={ajouter}
          onAnnuler={() => setAjout(false)}
        />
      ) : (
        <Button
          className="self-start"
          onClick={() => {
            effacerMessages()
            setEnModification(null)
            setAjout(true)
          }}
        >
          Ajouter un grade
        </Button>
      )}

      <EtatLecture enChargement={grades.isPending} erreur={grades.isError} />

      {grades.data && grades.data.length === 0 && (
        <p className="text-muted-foreground">Aucun grade.</p>
      )}

      {grades.data && grades.data.length > 0 && (
        <ul aria-label="Liste des grades" className="flex flex-col gap-2">
          {grades.data.map((grade) => (
            <li key={grade.id} className="rounded-md border p-3 text-sm">
              {enModification === grade.id ? (
                <FormulaireGrade
                  titre="Modifier le grade"
                  initial={{ libelle: grade.libelle, ordre: String(grade.ordre) }}
                  onEnregistrer={(saisie) => enregistrerModification(grade.id, saisie)}
                  onAnnuler={() => setEnModification(null)}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{grade.libelle}</span>
                    {!grade.actif && <Badge variant="secondary">Archivé</Badge>}
                  </div>
                  <span className="text-muted-foreground">Ordre : {grade.ordre}</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        effacerMessages()
                        setAjout(false)
                        setEnModification(grade.id)
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={changerActif.isPending}
                      onClick={() => void basculerActif(grade)}
                    >
                      {grade.actif ? 'Archiver' : 'Réactiver'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        effacerMessages()
                        setASupprimer(grade)
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Confirmation
        ouverte={aSupprimer !== null}
        titre={MESSAGES.confirmationSuppressionGrade}
        paragraphes={aSupprimer ? [aSupprimer.libelle] : []}
        action="Supprimer"
        onConfirmer={() => void confirmerSuppression()}
        onAnnuler={() => setASupprimer(null)}
      />
    </Section>
  )
}

/**
 * Formulaire d'ajout ou de modification d'un grade. En cas de refus (doublon,
 * réseau…), le message s'affiche et la saisie est conservée.
 */
function FormulaireGrade({
  titre,
  initial,
  onEnregistrer,
  onAnnuler,
}: {
  titre: string
  initial: ChampsGrade
  /** Enregistre la saisie ; une erreur levée est affichée dans le formulaire. */
  onEnregistrer: (saisie: SaisieGrade) => Promise<void>
  onAnnuler: () => void
}) {
  const enLigne = useEnLigne()
  const [champs, setChamps] = useState(initial)
  const [erreurs, setErreurs] = useState<Partial<Record<ChampGrade, string>>>({})
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErreur(null)
    const lecture = lireSaisieGrade(champs)
    setErreurs(lecture.erreurs)
    if (lecture.saisie === null) return
    if (!enLigne) {
      setErreur(MESSAGES.horsLigne)
      return
    }
    setOccupe(true)
    try {
      await onEnregistrer(lecture.saisie)
    } catch (e) {
      setErreur(messageErreur(e))
      setOccupe(false)
    }
  }

  return (
    <form onSubmit={soumettre} aria-label={titre} className="flex flex-col gap-3" noValidate>
      <h3 className="font-medium">{titre}</h3>
      <ChampTexte
        libelle="Libellé"
        valeur={champs.libelle}
        onChange={(libelle) => setChamps((c) => ({ ...c, libelle }))}
        erreur={erreurs.libelle}
      />
      <ChampTexte
        libelle="Ordre"
        inputMode="numeric"
        valeur={champs.ordre}
        onChange={(ordre) => setChamps((c) => ({ ...c, ordre }))}
        erreur={erreurs.ordre}
      />
      <MessageErreur message={erreur} />
      <BoutonsFormulaire occupe={occupe} onAnnuler={onAnnuler} />
    </form>
  )
}
