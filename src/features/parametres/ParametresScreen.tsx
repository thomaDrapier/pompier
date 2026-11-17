import { useId, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BoutonsFormulaire,
  ChampTexte,
  Confirmation,
  EtatLecture,
  MessageErreur,
  MessageReussite,
  Section,
} from '@/components/communs'
import {
  avecStatut,
  dateParis,
  gradeALaDate,
  tauxCouple,
  texteProchainTaux,
  texteTauxEnVigueur,
} from '@/data/affichage-referentiel'
import type { LigneGrade, LigneHistoriqueGrade } from '@/data/conversions'
import type { Referentiel } from '@/data/requetes'
import type { SaisieHistoriqueGrade } from '@/data/requetes-referentiel'
import { useAuth } from '@/features/auth/useAuth'
import { envoyerLienReinitialisation } from '@/features/auth/reinitialisation'
import {
  MESSAGES_PARAMETRES,
  dateAConfirmer,
  gradesProposes,
  libelleGrade,
  lireSaisieHistorique,
  messageErreurHistorique,
  messageRecalcul,
} from '@/features/parametres/regles-parametres'
import type { ChampHistorique, ChampsHistorique } from '@/features/parametres/regles-parametres'
import {
  useAjouterGradeHistorique,
  useCorrigerGradeHistorique,
  useSupprimerGradeHistorique,
} from '@/hooks/useEcritureHistoriqueGrades'
import { useEnLigne } from '@/hooks/useEnLigne'
import { useHistoriqueGrades } from '@/hooks/useHistoriqueGrades'
import { useReferentiel } from '@/hooks/useReferentiel'
import { formaterJour } from '@/lib/formats'
import { MESSAGES_COMMUNS } from '@/lib/messages'

// Paramètres — /parametres (spécifications des écrans v1.2, section 5) :
// grade et historique de grades de l'utilisateur (D-017), taux de son grade
// en lecture seule, compte.
//
// Le grade actuel, les statuts et les taux viennent du moteur de calcul
// (src/data/affichage-referentiel.ts). Après chaque écriture de l'historique,
// le référentiel, l'historique et les activités sont relus (D-029) : les
// montants de la liste des activités se recalculent.
export function ParametresScreen() {
  const referentiel = useReferentiel()
  const historique = useHistoriqueGrades()
  // Date du jour à Paris, lue une seule fois à l'ouverture de l'écran.
  const [aujourdhui] = useState(() => dateParis(new Date()))

  const donnees =
    referentiel.data && historique.data
      ? { referentiel: referentiel.data, historique: historique.data }
      : null
  const gradeActuel = donnees ? gradeALaDate(donnees.historique, aujourdhui) : null

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">Paramètres</h1>

      <EtatLecture
        enChargement={referentiel.isPending || historique.isPending}
        erreur={referentiel.isError || historique.isError}
      />

      {donnees && (
        <>
          <MonGrade
            grades={donnees.referentiel.grades}
            historique={donnees.historique}
            gradeActuel={gradeActuel}
            aujourdhui={aujourdhui}
          />
          <TauxDeMonGrade
            referentiel={donnees.referentiel}
            gradeActuel={gradeActuel}
            aujourdhui={aujourdhui}
          />
        </>
      )}

      <Compte />
    </main>
  )
}

/** Écriture demandée dans l'historique de grades. */
type Action =
  | { type: 'ajout'; saisie: SaisieHistoriqueGrade }
  | { type: 'correction'; ligne: LigneHistoriqueGrade; saisie: SaisieHistoriqueGrade }
  | { type: 'suppression'; ligne: LigneHistoriqueGrade }

/** Action en attente de confirmation, avec le texte de la boîte de dialogue. */
interface AConfirmer {
  action: Action
  titre: string
  paragraphes: string[]
  bouton: string
}

/**
 * Confirmation à demander avant une écriture (spécifications 5.1), ou null :
 * - ajout : seulement si la date d'effet est passée (D-021) ;
 * - correction : si l'ancienne ou la nouvelle date d'effet est passée ;
 * - suppression : toujours.
 * Lit l'horloge : à appeler au moment de l'action, jamais pendant l'affichage.
 */
function confirmationPour(action: Action): AConfirmer | null {
  if (action.type === 'suppression') {
    return {
      action,
      titre: MESSAGES_PARAMETRES.confirmationSuppression,
      paragraphes: [MESSAGES_PARAMETRES.detailSuppression],
      bouton: 'Supprimer',
    }
  }
  const ancienne = action.type === 'correction' ? action.ligne.date_effet : null
  const date = dateAConfirmer(ancienne, action.saisie.dateEffet, new Date())
  if (date === null) return null
  return {
    action,
    titre: action.type === 'ajout' ? 'Ajouter un grade' : 'Corriger le grade',
    paragraphes: [messageRecalcul(date)],
    bouton: 'Confirmer',
  }
}

/** 5.1 Mon grade : grade actuel, historique, ajout, correction, suppression. */
function MonGrade({
  grades,
  historique,
  gradeActuel,
  aujourdhui,
}: {
  grades: readonly LigneGrade[]
  historique: readonly LigneHistoriqueGrade[]
  gradeActuel: LigneHistoriqueGrade | null
  aujourdhui: string
}) {
  const ajouter = useAjouterGradeHistorique()
  const corriger = useCorrigerGradeHistorique()
  const supprimer = useSupprimerGradeHistorique()
  const enLigne = useEnLigne()

  const [ajout, setAjout] = useState(false)
  const [enCorrection, setEnCorrection] = useState<string | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  // Erreur d'un enregistrement, renvoyée au formulaire resté ouvert.
  const [erreurFormulaire, setErreurFormulaire] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<AConfirmer | null>(null)

  const gradesParId = new Map(grades.map((grade) => [grade.id, grade]))
  const libelle = (gradeId: string) => gradesParId.get(gradeId)?.libelle ?? 'Grade inconnu'
  const lignes = avecStatut(historique, aujourdhui)
  const occupe = ajouter.isPending || corriger.isPending || supprimer.isPending

  function effacerMessages() {
    setReussite(null)
    setErreur(null)
    setErreurFormulaire(null)
  }

  function demander(action: Action) {
    const confirmation = confirmationPour(action)
    if (confirmation === null) void executer(action)
    else setAConfirmer(confirmation)
  }

  async function executer(action: Action) {
    setAConfirmer(null)
    setErreur(null)
    setErreurFormulaire(null)
    if (!enLigne) {
      if (action.type === 'suppression') setErreur(MESSAGES_COMMUNS.horsLigne)
      else setErreurFormulaire(MESSAGES_COMMUNS.horsLigne)
      return
    }
    try {
      if (action.type === 'ajout') {
        await ajouter.mutateAsync(action.saisie)
        setAjout(false)
        setReussite(MESSAGES_PARAMETRES.gradeAjoute)
      } else if (action.type === 'correction') {
        await corriger.mutateAsync({ id: action.ligne.id, saisie: action.saisie })
        setEnCorrection(null)
        setReussite(MESSAGES_PARAMETRES.gradeModifie)
      } else {
        await supprimer.mutateAsync(action.ligne.id)
        setReussite(MESSAGES_PARAMETRES.gradeSupprime)
      }
    } catch (e) {
      // Doublon de date (D-028), réseau… : le formulaire garde sa saisie.
      if (action.type === 'suppression') setErreur(messageErreurHistorique(e))
      else setErreurFormulaire(messageErreurHistorique(e))
    }
  }

  return (
    <Section titre="Mon grade">
      <MessageReussite message={reussite} />
      <MessageErreur message={erreur} />

      {gradeActuel ? (
        <p>
          Grade actuel : <span className="font-semibold">{libelle(gradeActuel.grade_id)}</span>
        </p>
      ) : (
        <p className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
          {MESSAGES_PARAMETRES.aucunGrade}
        </p>
      )}

      {ajout ? (
        <FormulaireGrade
          titre="Nouveau grade"
          grades={gradesProposes(grades, null)}
          initial={{ gradeId: '', dateEffet: aujourdhui }}
          occupe={occupe}
          erreurExterne={erreurFormulaire}
          onValider={(saisie) => demander({ type: 'ajout', saisie })}
          onAnnuler={() => {
            setAjout(false)
            setErreurFormulaire(null)
          }}
        />
      ) : (
        <Button
          className="self-start"
          onClick={() => {
            effacerMessages()
            setEnCorrection(null)
            setAjout(true)
          }}
        >
          Ajouter un grade
        </Button>
      )}

      {lignes.length > 0 && (
        <ul aria-label="Historique de mes grades" className="flex flex-col gap-2">
          {lignes.map(({ ligne, statut }) => {
            const grade = gradesParId.get(ligne.grade_id)
            return (
              <li key={ligne.id} className="rounded-md border p-3 text-sm">
                {enCorrection === ligne.id ? (
                  <FormulaireGrade
                    titre="Corriger le grade"
                    grades={gradesProposes(grades, ligne.grade_id)}
                    initial={{ gradeId: ligne.grade_id, dateEffet: ligne.date_effet }}
                    occupe={occupe}
                    erreurExterne={erreurFormulaire}
                    onValider={(saisie) => demander({ type: 'correction', ligne, saisie })}
                    onAnnuler={() => {
                      setEnCorrection(null)
                      setErreurFormulaire(null)
                    }}
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{libelle(ligne.grade_id)}</span>
                      <span className="flex gap-1">
                        {statut === 'en_vigueur' && <Badge>Actuel</Badge>}
                        {statut === 'a_venir' && <Badge variant="outline">À venir</Badge>}
                        {grade && !grade.actif && <Badge variant="secondary">Archivé</Badge>}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      Date d’effet : {formaterJour(ligne.date_effet)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          effacerMessages()
                          setAjout(false)
                          setEnCorrection(ligne.id)
                        }}
                      >
                        Corriger
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          effacerMessages()
                          demander({ type: 'suppression', ligne })
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Confirmation
        ouverte={aConfirmer !== null}
        titre={aConfirmer?.titre ?? ''}
        paragraphes={aConfirmer?.paragraphes ?? []}
        action={aConfirmer?.bouton ?? 'Confirmer'}
        onConfirmer={() => {
          if (aConfirmer) void executer(aConfirmer.action)
        }}
        onAnnuler={() => setAConfirmer(null)}
      />
    </Section>
  )
}

/**
 * Formulaire d'une ligne de l'historique : grade (liste déroulante native) et
 * date d'effet, tous deux obligatoires. La confirmation éventuelle et
 * l'enregistrement sont faits par « Mon grade » ; la saisie reste affichée
 * tant que l'enregistrement n'a pas réussi.
 */
function FormulaireGrade({
  titre,
  grades,
  initial,
  occupe,
  erreurExterne,
  onValider,
  onAnnuler,
}: {
  titre: string
  grades: readonly LigneGrade[]
  initial: ChampsHistorique
  occupe: boolean
  erreurExterne: string | null
  onValider: (saisie: SaisieHistoriqueGrade) => void
  onAnnuler: () => void
}) {
  const idGrade = useId()
  const [champs, setChamps] = useState(initial)
  const [erreurs, setErreurs] = useState<Partial<Record<ChampHistorique, string>>>({})

  function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const lecture = lireSaisieHistorique(champs)
    setErreurs(lecture.erreurs)
    if (lecture.saisie !== null) onValider(lecture.saisie)
  }

  return (
    <form onSubmit={soumettre} aria-label={titre} className="flex flex-col gap-3" noValidate>
      <h3 className="font-medium">{titre}</h3>
      <div className="flex flex-col gap-1">
        <label htmlFor={idGrade} className="text-sm font-medium">
          Grade
        </label>
        <select
          id={idGrade}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={champs.gradeId}
          aria-invalid={erreurs.gradeId !== undefined}
          onChange={(e) => setChamps((c) => ({ ...c, gradeId: e.target.value }))}
        >
          {champs.gradeId === '' && <option value="">Choisir…</option>}
          {grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {libelleGrade(grade)}
            </option>
          ))}
        </select>
        <MessageErreur message={erreurs.gradeId} />
      </div>
      <ChampTexte
        libelle="Date d’effet"
        type="date"
        valeur={champs.dateEffet}
        onChange={(dateEffet) => setChamps((c) => ({ ...c, dateEffet }))}
        erreur={erreurs.dateEffet}
      />
      <MessageErreur message={erreurExterne} />
      <BoutonsFormulaire occupe={occupe} onAnnuler={onAnnuler} />
    </form>
  )
}

/** 5.2 Taux de mon grade : lecture seule, une ligne par nature active. */
function TauxDeMonGrade({
  referentiel,
  gradeActuel,
  aujourdhui,
}: {
  referentiel: Referentiel
  gradeActuel: LigneHistoriqueGrade | null
  aujourdhui: string
}) {
  return (
    <Section titre="Taux de mon grade">
      {gradeActuel === null ? (
        <p className="text-muted-foreground">{MESSAGES_PARAMETRES.renseignezGrade}</p>
      ) : (
        <ul aria-label="Taux de mon grade" className="flex flex-col gap-2">
          {referentiel.natures
            .filter((nature) => nature.actif)
            .map((nature) => {
              const { enVigueur, prochain } = tauxCouple(
                referentiel.taux,
                gradeActuel.grade_id,
                nature.id,
                aujourdhui,
              )
              return (
                <li key={nature.id} className="flex flex-col gap-1 rounded-md border p-3 text-sm">
                  <span className="font-medium">{nature.libelle}</span>
                  <span>{enVigueur ? texteTauxEnVigueur(enVigueur) : 'Aucun taux'}</span>
                  {prochain && (
                    <span className="text-muted-foreground">{texteProchainTaux(prochain)}</span>
                  )}
                </li>
              )
            })}
        </ul>
      )}
    </Section>
  )
}

/** 5.3 Compte : e-mail en lecture seule et changement du mot de passe par lien. */
function Compte() {
  const email = useAuth().session?.user.email ?? ''
  const enLigne = useEnLigne()
  const [envoi, setEnvoi] = useState(false)
  const [reussite, setReussite] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  async function changerMotDePasse() {
    setReussite(null)
    setErreur(null)
    if (!enLigne) {
      setErreur(MESSAGES_PARAMETRES.lienHorsLigne)
      return
    }
    setEnvoi(true)
    const { erreur: echec } = await envoyerLienReinitialisation(email)
    setEnvoi(false)
    if (echec) setErreur(MESSAGES_PARAMETRES.lienEchec)
    else setReussite(MESSAGES_PARAMETRES.lienEnvoye)
  }

  return (
    <Section titre="Compte">
      <MessageReussite message={reussite} />
      <MessageErreur message={erreur} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
        <dt className="text-muted-foreground">Adresse e-mail</dt>
        <dd className="break-all">{email}</dd>
      </dl>
      <Button
        variant="outline"
        className="self-start"
        disabled={envoi || email === ''}
        onClick={() => void changerMotDePasse()}
      >
        {envoi ? 'Envoi…' : 'Changer le mot de passe'}
      </Button>
    </Section>
  )
}
