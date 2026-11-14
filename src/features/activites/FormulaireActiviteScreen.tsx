import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { LigneActivite, LigneNature } from '@/data/conversions'
import { ErreurChevauchementAstreintes } from '@/data/erreurs'
import { lireActivitesChevauchant } from '@/data/requetes'
import {
  changerChamp,
  dureeEnDirect,
  etatInitialCreation,
  etatInitialModification,
} from '@/features/activites/etat-formulaire'
import type { ChampFormulaire, EtatFormulaire } from '@/features/activites/etat-formulaire'
import {
  MESSAGE_CHEVAUCHEMENT_GENERIQUE,
  lireSaisie,
  verifierConflits,
} from '@/features/activites/regles-saisie'
import type { ErreursChamps, SaisieValide } from '@/features/activites/regles-saisie'
import { useAuth } from '@/features/auth/useAuth'
import { useActivite, useDerniereActivite } from '@/hooks/useActivite'
import {
  useCreerActivite,
  useModifierActivite,
  useSupprimerActivite,
} from '@/hooks/useEcritureActivites'
import { useEnLigne } from '@/hooks/useEnLigne'
import { useReferentiel } from '@/hooks/useReferentiel'
import { formaterDuree } from '@/lib/formats'
import { moisDe } from '@/lib/temps'
import { ADRESSES, adresseListe, lireEtatNavigation } from '@/routes/adresses'
import type { EtatNavigation } from '@/routes/adresses'

const MESSAGE_HORS_LIGNE = 'Pas de connexion réseau : l’activité ne peut pas être enregistrée.'
const MESSAGE_ERREUR_SERVEUR =
  'L’enregistrement a échoué. Vérifiez votre connexion et réessayez.'

// Saisie d'une nouvelle activité (/activites/nouvelle) ou modification
// (/activites/:id) — spécifications des écrans, section 3.
// Cet écran attend les données nécessaires, puis monte le formulaire avec ses
// valeurs de départ.
export function FormulaireActiviteScreen() {
  const { id } = useParams()
  const location = useLocation()
  const retour = lireEtatNavigation(location.state).retour ?? ADRESSES.activites

  const referentiel = useReferentiel()
  const activite = useActivite(id)
  const derniere = useDerniereActivite()

  const modification = id !== undefined
  const titre = modification ? 'Modifier l’activité' : 'Nouvelle activité'

  if (referentiel.error || (modification && activite.error)) {
    return (
      <Cadre titre={titre}>
        <p role="alert" className="text-sm text-destructive">
          Les données n’ont pas pu être chargées. Vérifiez votre connexion.
        </p>
        <BoutonRetour retour={retour} />
      </Cadre>
    )
  }

  // En création, la nature par défaut dépend de la dernière activité créée ;
  // si sa lecture échoue, on se rabat sur la première nature active.
  const enAttente =
    referentiel.data === undefined ||
    (modification ? activite.isPending : derniere.isPending)
  if (enAttente) {
    return (
      <Cadre titre={titre}>
        <p role="status" className="text-muted-foreground">
          Chargement…
        </p>
      </Cadre>
    )
  }

  const natures = referentiel.data.natures

  if (modification) {
    if (!activite.data) {
      return (
        <Cadre titre={titre}>
          <p role="alert">Activité introuvable</p>
          <BoutonRetour retour={retour} />
        </Cadre>
      )
    }
    const ligne = activite.data
    return (
      <Cadre titre={titre}>
        <Formulaire
          // Un formulaire neuf par activité et par version relue.
          key={`${activite.data.id}-${activite.data.modifie_le}`}
          natures={natures}
          activite={activite.data}
          creerEtatInitial={() => etatInitialModification(ligne)}
          retour={retour}
        />
      </Cadre>
    )
  }

  const actives = natures.filter((nature) => nature.actif)
  const natureDerniere = actives.find(
    (nature) => nature.id === derniere.data?.activity_type_id,
  )
  const natureParDefaut = natureDerniere?.id ?? actives[0]?.id ?? ''

  return (
    <Cadre titre={titre}>
      <Formulaire
        natures={natures}
        activite={null}
        // « Maintenant » est lu une seule fois, à l'ouverture du formulaire.
        creerEtatInitial={() => etatInitialCreation(new Date(), natureParDefaut)}
        retour={retour}
      />
    </Cadre>
  )
}

function Cadre({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">{titre}</h1>
      {children}
    </main>
  )
}

function BoutonRetour({ retour }: { retour: string }) {
  return (
    <Button asChild variant="outline" className="self-start">
      <Link to={retour}>Retour à la liste</Link>
    </Button>
  )
}

function Formulaire({
  natures,
  activite,
  creerEtatInitial,
  retour,
}: {
  natures: readonly LigneNature[]
  /** Activité modifiée, ou null en création. */
  activite: LigneActivite | null
  /** Valeurs de départ des champs, calculées une seule fois au montage. */
  creerEtatInitial: () => EtatFormulaire
  retour: string
}) {
  const navigate = useNavigate()
  const userId = useAuth().session?.user.id
  const enLigne = useEnLigne()
  const creer = useCreerActivite()
  const modifier = useModifierActivite()
  const supprimer = useSupprimerActivite()

  // L'état initial n'est lu qu'au montage : la saisie en cours est conservée.
  const [etat, setEtat] = useState(creerEtatInitial)
  const [noteVisible, setNoteVisible] = useState((activite?.note ?? '') !== '')
  const [erreurs, setErreurs] = useState<ErreursChamps>({})
  const [messageErreur, setMessageErreur] = useState<string | null>(null)
  const [verification, setVerification] = useState(false)
  // Saisie en attente de confirmation, avec ses avertissements.
  const [aConfirmer, setAConfirmer] = useState<{
    saisie: SaisieValide
    avertissements: string[]
  } | null>(null)
  const [suppressionDemandee, setSuppressionDemandee] = useState(false)

  const occupe = verification || creer.isPending || modifier.isPending || supprimer.isPending
  const duree = dureeEnDirect(etat)

  // Seules les natures actives sont proposées ; en modification, la nature
  // d'origine reste affichée même si elle a été archivée.
  const naturesProposees = natures.filter(
    (nature) => nature.actif || nature.id === activite?.activity_type_id,
  )

  function changer(champ: ChampFormulaire, valeur: string) {
    setEtat((precedent) => changerChamp(precedent, champ, valeur))
  }

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessageErreur(null)

    // 1. Contrôles bloquants sur les champs.
    const lecture = lireSaisie(etat)
    setErreurs(lecture.erreurs)
    if (lecture.saisie === null) return

    if (!enLigne || userId === undefined) {
      setMessageErreur(MESSAGE_HORS_LIGNE)
      return
    }

    // 2. Contrôles par rapport aux activités qui chevauchent la plage saisie,
    //    lues à cet effet juste avant l'enregistrement.
    setVerification(true)
    let conflits
    try {
      const voisines = await lireActivitesChevauchant(userId, {
        debut: lecture.saisie.debut,
        fin: lecture.saisie.fin,
      })
      conflits = verifierConflits(
        lecture.saisie,
        natures.map((nature) => ({
          id: nature.id,
          libelle: nature.libelle,
          estAstreinte: nature.est_astreinte,
        })),
        voisines.map((voisine) => ({
          id: voisine.id,
          natureId: voisine.activity_type_id,
          debut: new Date(voisine.debut),
          fin: new Date(voisine.fin),
        })),
        activite?.id ?? null,
      )
    } catch {
      setMessageErreur(MESSAGE_ERREUR_SERVEUR)
      return
    } finally {
      setVerification(false)
    }

    if (conflits.bloquant !== null) {
      setMessageErreur(conflits.bloquant)
      return
    }
    if (conflits.avertissements.length > 0) {
      setAConfirmer({ saisie: lecture.saisie, avertissements: conflits.avertissements })
      return
    }
    await enregistrer(lecture.saisie)
  }

  async function enregistrer(saisie: SaisieValide) {
    setAConfirmer(null)
    try {
      if (activite === null) {
        await creer.mutateAsync(saisie)
      } else {
        await modifier.mutateAsync({ id: activite.id, saisie })
      }
    } catch (erreur) {
      // La base a refusé pour chevauchement d'astreintes (D-010) : l'autre
      // astreinte n'est connue que par cette erreur, d'où le message générique.
      setMessageErreur(
        erreur instanceof ErreurChevauchementAstreintes
          ? MESSAGE_CHEVAUCHEMENT_GENERIQUE
          : MESSAGE_ERREUR_SERVEUR,
      )
      return
    }
    // Retour à la liste, sur le mois de l'activité.
    navigate(adresseListe(moisDe(saisie.debut)), {
      state: { message: 'Activité enregistrée' } satisfies EtatNavigation,
    })
  }

  async function confirmerSuppression() {
    setSuppressionDemandee(false)
    if (activite === null) return
    setMessageErreur(null)
    if (!enLigne) {
      setMessageErreur('Pas de connexion réseau : l’activité ne peut pas être supprimée.')
      return
    }
    try {
      await supprimer.mutateAsync(activite.id)
    } catch {
      setMessageErreur('La suppression a échoué. Vérifiez votre connexion et réessayez.')
      return
    }
    navigate(adresseListe(moisDe(new Date(activite.debut))), {
      state: { message: 'Activité supprimée' } satisfies EtatNavigation,
    })
  }

  return (
    <>
      <form onSubmit={soumettre} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nature">Nature</Label>
          <select
            id="nature"
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={etat.natureId}
            aria-invalid={erreurs.nature !== undefined}
            onChange={(e) => changer('natureId', e.target.value)}
          >
            {etat.natureId === '' && <option value="">Choisir…</option>}
            {naturesProposees.map((nature) => (
              <option key={nature.id} value={nature.id}>
                {nature.libelle}
              </option>
            ))}
          </select>
          <ErreurChamp message={erreurs.nature} />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Début</legend>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="date-debut">Date de début</Label>
              <Input
                id="date-debut"
                type="date"
                value={etat.dateDebut}
                aria-invalid={erreurs.debut !== undefined}
                onChange={(e) => changer('dateDebut', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="heure-debut">Heure de début</Label>
              <Input
                id="heure-debut"
                type="time"
                value={etat.heureDebut}
                aria-invalid={erreurs.debut !== undefined}
                onChange={(e) => changer('heureDebut', e.target.value)}
              />
            </div>
          </div>
          <ErreurChamp message={erreurs.debut} />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Fin</legend>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="date-fin">Date de fin</Label>
              <Input
                id="date-fin"
                type="date"
                value={etat.dateFin}
                aria-invalid={erreurs.fin !== undefined}
                onChange={(e) => changer('dateFin', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="heure-fin">Heure de fin</Label>
              <Input
                id="heure-fin"
                type="time"
                value={etat.heureFin}
                aria-invalid={erreurs.fin !== undefined}
                onChange={(e) => changer('heureFin', e.target.value)}
              />
            </div>
          </div>
          <ErreurChamp message={erreurs.fin} />
        </fieldset>

        {/* Durée en direct, calculée sur les instants réels. */}
        {duree !== null && (
          <p role="status" className="text-sm">
            Durée : {formaterDuree(duree)}
          </p>
        )}

        {noteVisible ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={etat.note}
              onChange={(e) => changer('note', e.target.value)}
            />
          </div>
        ) : (
          <Button
            type="button"
            variant="link"
            className="self-start px-0"
            onClick={() => setNoteVisible(true)}
          >
            Ajouter une note
          </Button>
        )}

        {messageErreur && (
          <p role="alert" className="text-sm text-destructive">
            {messageErreur}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" disabled={occupe}>
            {occupe ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to={retour}>Annuler</Link>
          </Button>
          {activite !== null && (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={occupe}
              onClick={() => setSuppressionDemandee(true)}
            >
              Supprimer
            </Button>
          )}
        </div>
      </form>

      {/* Avertissements : doublon exact, chevauchement hors astreinte. */}
      <AlertDialog
        open={aConfirmer !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) setAConfirmer(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enregistrer cette activité ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-1">
                {aConfirmer?.avertissements.map((avertissement) => (
                  <p key={avertissement}>{avertissement}</p>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aConfirmer) void enregistrer(aConfirmer.saisie)
              }}
            >
              Enregistrer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={suppressionDemandee} onOpenChange={setSuppressionDemandee}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette activité ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmerSuppression()}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ErreurChamp({ message }: { message: string | undefined }) {
  if (message === undefined) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}
