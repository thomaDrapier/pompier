import { useId, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { LigneNature } from '@/data/conversions'
import { ErreurAstreinteVerrouillee } from '@/data/erreurs'
import type { SaisieNature } from '@/data/requetes-referentiel'
import {
  BoutonsFormulaire,
  ChampTexte,
  Confirmation,
  EtatLecture,
  MessageErreur,
  MessageReussite,
  Section,
} from '@/components/communs'
import { MESSAGES, messageErreur } from '@/features/admin/messages'
import { lireSaisieNature } from '@/features/admin/regles-admin'
import type { ChampNature, ChampsNature } from '@/features/admin/regles-admin'
import {
  useChangerActifNature,
  useCreerNature,
  useModifierNature,
  useNatureUtilisee,
  useNatures,
  useSupprimerNature,
} from '@/hooks/useAdministrationReferentiel'
import { useEnLigne } from '@/hooks/useEnLigne'

/**
 * Case « Est une astreinte » (D-022) :
 * - libre : modifiable (création, ou nature qu'aucune activité n'utilise) ;
 * - verification : on demande à la base si la nature a servi, case grisée ;
 * - verrouillee : la nature a servi, case grisée avec l'explication.
 */
type EtatAstreinte = 'libre' | 'verification' | 'verrouillee'

// Administration › Natures — /admin/natures (spécifications 6.3).
// Mêmes principes que les grades ; en plus, la case « Est une astreinte »
// n'est modifiable que si aucune activité, de quelque utilisateur que ce
// soit, n'utilise la nature (nature_utilisee, D-022).
export function NaturesScreen() {
  const natures = useNatures()
  const creer = useCreerNature()
  const changerActif = useChangerActifNature()
  const supprimer = useSupprimerNature()
  const enLigne = useEnLigne()

  const [ajout, setAjout] = useState(false)
  const [enModification, setEnModification] = useState<string | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState<LigneNature | null>(null)

  function effacerMessages() {
    setReussite(null)
    setErreur(null)
  }

  async function ajouter(saisie: SaisieNature) {
    await creer.mutateAsync(saisie)
    setAjout(false)
    setReussite(MESSAGES.natureAjoutee)
  }

  async function basculerActif(nature: LigneNature) {
    effacerMessages()
    if (!enLigne) {
      setErreur(MESSAGES.horsLigne)
      return
    }
    try {
      await changerActif.mutateAsync({ id: nature.id, actif: !nature.actif })
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  async function confirmerSuppression() {
    const nature = aSupprimer
    setASupprimer(null)
    if (nature === null) return
    if (!enLigne) {
      setErreur(MESSAGES.horsLigne)
      return
    }
    try {
      await supprimer.mutateAsync(nature.id)
      setReussite(MESSAGES.natureSupprimee)
    } catch (e) {
      setErreur(messageErreur(e, 'nature'))
    }
  }

  return (
    <Section titre="Natures">
      <MessageReussite message={reussite} />
      <MessageErreur message={erreur} />

      {ajout ? (
        <FormulaireNature
          titre="Nouvelle nature"
          initial={{ libelle: '', code: '', ordre: '', estAstreinte: false, estIntervention: false }}
          etatAstreinte="libre"
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
          Ajouter une nature
        </Button>
      )}

      <EtatLecture enChargement={natures.isPending} erreur={natures.isError} />

      {natures.data && natures.data.length === 0 && (
        <p className="text-muted-foreground">Aucune nature.</p>
      )}

      {natures.data && natures.data.length > 0 && (
        <ul aria-label="Liste des natures" className="flex flex-col gap-2">
          {natures.data.map((nature) => (
            <li key={nature.id} className="rounded-md border p-3 text-sm">
              {enModification === nature.id ? (
                <ModificationNature
                  nature={nature}
                  onTerminee={() => {
                    setEnModification(null)
                    setReussite(MESSAGES.natureModifiee)
                  }}
                  onAnnuler={() => setEnModification(null)}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{nature.libelle}</span>
                    <span className="flex gap-1">
                      {nature.est_astreinte && <Badge variant="outline">Astreinte</Badge>}
                      {nature.est_intervention && <Badge variant="outline">Intervention</Badge>}
                      {!nature.actif && <Badge variant="secondary">Archivée</Badge>}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    Code : {nature.code} · Ordre : {nature.ordre}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        effacerMessages()
                        setAjout(false)
                        setEnModification(nature.id)
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={changerActif.isPending}
                      onClick={() => void basculerActif(nature)}
                    >
                      {nature.actif ? 'Archiver' : 'Réactiver'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        effacerMessages()
                        setASupprimer(nature)
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
        titre={MESSAGES.confirmationSuppressionNature}
        paragraphes={aSupprimer ? [aSupprimer.libelle] : []}
        action="Supprimer"
        onConfirmer={() => void confirmerSuppression()}
        onAnnuler={() => setASupprimer(null)}
      />
    </Section>
  )
}

/**
 * Modification d'une nature : demande d'abord à la base si la nature a servi,
 * pour griser la case « Est une astreinte » (D-022). La réponse est relue à
 * chaque ouverture du formulaire ; pendant la lecture, la case est grisée.
 */
function ModificationNature({
  nature,
  onTerminee,
  onAnnuler,
}: {
  nature: LigneNature
  onTerminee: () => void
  onAnnuler: () => void
}) {
  const modifier = useModifierNature()
  const utilisee = useNatureUtilisee(nature.id)

  const etatAstreinte: EtatAstreinte =
    utilisee.data === true ? 'verrouillee' : utilisee.data === false && !utilisee.isFetching ? 'libre' : 'verification'

  async function enregistrer(saisie: SaisieNature) {
    try {
      await modifier.mutateAsync({ id: nature.id, saisie })
    } catch (e) {
      // La nature a servi entre l'ouverture du formulaire et l'enregistrement :
      // la case se grise (relecture) et l'explication s'affiche.
      if (e instanceof ErreurAstreinteVerrouillee) void utilisee.refetch()
      throw e
    }
    onTerminee()
  }

  return (
    <FormulaireNature
      titre="Modifier la nature"
      initial={{
        libelle: nature.libelle,
        code: nature.code,
        ordre: String(nature.ordre),
        estAstreinte: nature.est_astreinte,
        estIntervention: nature.est_intervention,
      }}
      etatAstreinte={etatAstreinte}
      onEnregistrer={enregistrer}
      onAnnuler={onAnnuler}
    />
  )
}

function FormulaireNature({
  titre,
  initial,
  etatAstreinte,
  onEnregistrer,
  onAnnuler,
}: {
  titre: string
  initial: ChampsNature
  etatAstreinte: EtatAstreinte
  onEnregistrer: (saisie: SaisieNature) => Promise<void>
  onAnnuler: () => void
}) {
  const enLigne = useEnLigne()
  const idCase = useId()
  const idExplication = useId()
  const [champs, setChamps] = useState(initial)
  const [erreurs, setErreurs] = useState<Partial<Record<ChampNature, string>>>({})
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  // Case grisée : la valeur d'origine est conservée, quoi qu'on ait coché.
  const caseLibre = etatAstreinte === 'libre'
  const estAstreinte = caseLibre ? champs.estAstreinte : initial.estAstreinte
  const estIntervention = champs.estIntervention
  // D-032 : les deux cases s'excluent ; cocher l'une grise l'autre.
  const astreinteExclue = estIntervention && !estAstreinte
  const interventionExclue = estAstreinte
  const idCaseIntervention = useId()
  const idExclusion = useId()

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErreur(null)
    const lecture = lireSaisieNature({ ...champs, estAstreinte, estIntervention })
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
      // L'explication du verrou est déjà affichée sous la case une fois
      // celle-ci grisée : elle n'est pas répétée en bas du formulaire.
      setErreur(e instanceof ErreurAstreinteVerrouillee ? null : messageErreur(e))
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
        libelle="Code"
        valeur={champs.code}
        onChange={(code) => setChamps((c) => ({ ...c, code }))}
        erreur={erreurs.code}
      />
      <ChampTexte
        libelle="Ordre"
        inputMode="numeric"
        valeur={champs.ordre}
        onChange={(ordre) => setChamps((c) => ({ ...c, ordre }))}
        erreur={erreurs.ordre}
      />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            id={idCase}
            type="checkbox"
            className="size-4"
            checked={estAstreinte}
            disabled={!caseLibre || astreinteExclue}
            aria-describedby={
              etatAstreinte === 'verrouillee'
                ? idExplication
                : astreinteExclue
                  ? idExclusion
                  : undefined
            }
            onChange={(e) => setChamps((c) => ({ ...c, estAstreinte: e.target.checked }))}
          />
          <label htmlFor={idCase} className="text-sm font-medium">
            Est une astreinte
          </label>
        </div>
        {etatAstreinte === 'verrouillee' && (
          <p id={idExplication} className="text-sm text-muted-foreground">
            {MESSAGES.astreinteVerrouillee}
          </p>
        )}
      </div>
      {/* « Est une intervention » : modifiable à tout moment, même pour une
          nature déjà utilisée (D-032) ; seule l'exclusion la grise. */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            id={idCaseIntervention}
            type="checkbox"
            className="size-4"
            checked={estIntervention}
            disabled={interventionExclue}
            aria-describedby={interventionExclue ? idExclusion : undefined}
            onChange={(e) => setChamps((c) => ({ ...c, estIntervention: e.target.checked }))}
          />
          <label htmlFor={idCaseIntervention} className="text-sm font-medium">
            Est une intervention
          </label>
        </div>
        {(astreinteExclue || interventionExclue) && (
          <p id={idExclusion} className="text-sm text-muted-foreground">
            {MESSAGES.astreinteEtIntervention}
          </p>
        )}
      </div>
      <MessageErreur message={erreur} />
      <BoutonsFormulaire occupe={occupe} onAnnuler={onAnnuler} />
    </form>
  )
}
