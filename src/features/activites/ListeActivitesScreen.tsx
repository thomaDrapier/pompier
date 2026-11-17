import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useSearchParams } from 'react-router'
import { BandeauAnomalies, NombreAvecAnomalies } from '@/components/restitutions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CalculPeriode } from '@/data/calcul'
import type { LigneActivite as Activite, LigneNature } from '@/data/conversions'
import { CATEGORIES } from '@/engine'
import type { ResultatActivite, TotauxPeriode } from '@/engine'
import { useCalculPeriode } from '@/hooks/useCalculPeriode'
import { useReferentiel } from '@/hooks/useReferentiel'
import { useRestitutionMois } from '@/hooks/useRestitutions'
import { formaterDuree, formaterMois, formaterMontant, formaterPlage } from '@/lib/formats'
import { bornesDuMois, estMoisValide, moisDe, moisPrecedent, moisSuivant } from '@/lib/temps'
import { ADRESSES, adresseListe, lireEtatNavigation } from '@/routes/adresses'
import type { EtatNavigation } from '@/routes/adresses'

/** Valeur du filtre « Interventions » dans l'adresse (?nature=interventions). */
const FILTRE_INTERVENTIONS = 'interventions'

const LIBELLES_ANOMALIE = {
  taux_manquant: 'Taux manquant',
  chevauchement_astreintes: 'Chevauchement d’astreintes',
} as const

// Liste des activités d'un mois (spécifications des écrans, section 2).
// Le mois et le filtre sont dans l'adresse (?mois=2026-06&nature=…) : ils sont
// conservés par le bouton « retour » et au retour d'un autre écran.
// Toutes les durées nettes et tous les montants viennent du moteur de calcul :
// rien n'est recalculé ici. Les lignes viennent de useCalculPeriode ; les
// totaux du mois, de useRestitutionMois, comme l'accueil : un même mois donne
// donc les mêmes chiffres partout (astreinte nette ventilée, D-033 ; D-034 ;
// D-035).
export function ListeActivitesScreen() {
  const location = useLocation()
  const [parametres, setParametres] = useSearchParams()
  const referentiel = useReferentiel()
  const queryClient = useQueryClient()

  // Mois en cours, lu une seule fois à l'ouverture de l'écran.
  const [moisEnCours] = useState(() => moisDe(new Date()))

  // Paramètres d'adresse invalides : ignorés (mois en cours, filtre « Toutes »).
  const moisDemande = parametres.get('mois')
  const mois = estMoisValide(moisDemande) ? moisDemande : moisEnCours
  const natures = useMemo(() => referentiel.data?.natures ?? [], [referentiel.data])
  // Filtre : « Interventions » (toutes les natures d'intervention, D-032), une
  // nature, ou rien (« Toutes ») si la valeur est inconnue.
  const natureDemandee = parametres.get('nature')
  const filtre =
    natureDemandee === FILTRE_INTERVENTIONS || natures.some((nature) => nature.id === natureDemandee)
      ? natureDemandee
      : null

  const periode = useMemo(() => bornesDuMois(mois), [mois])
  const { calcul, enChargement, erreur } = useCalculPeriode(periode)
  const restitution = useRestitutionMois(mois)

  const adresseCourante = adresseListe(mois, filtre)
  const { message } = lireEtatNavigation(location.state)

  function allerAuMois(nouveauMois: string) {
    setParametres(filtre ? { mois: nouveauMois, nature: filtre } : { mois: nouveauMois })
  }

  function filtrer(natureId: string) {
    setParametres(natureId === '' ? { mois } : { mois, nature: natureId })
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl font-semibold">Activités</h1>

      {message && (
        <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
          {message}
        </p>
      )}

      <nav aria-label="Mois" className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => allerAuMois(moisPrecedent(mois))}>
          Mois précédent
        </Button>
        <h2 className="text-center font-medium capitalize">{formaterMois(mois)}</h2>
        <Button variant="outline" onClick={() => allerAuMois(moisSuivant(mois))}>
          Mois suivant
        </Button>
      </nav>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtre-nature" className="text-sm font-medium">
          Nature
        </label>
        <select
          id="filtre-nature"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={filtre ?? ''}
          onChange={(e) => filtrer(e.target.value)}
        >
          <option value="">Toutes</option>
          <option value={FILTRE_INTERVENTIONS}>Interventions</option>
          {/* Toutes les natures, archivées comprises, pour retrouver les
              activités anciennes (D-018). */}
          {natures.map((nature) => (
            <option key={nature.id} value={nature.id}>
              {nature.actif ? nature.libelle : `${nature.libelle} (Archivée)`}
            </option>
          ))}
        </select>
      </div>

      {(enChargement || restitution.enChargement) && !erreur && !restitution.erreur && (
        <p role="status" className="text-muted-foreground">
          Chargement…
        </p>
      )}

      {(erreur || restitution.erreur) && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-destructive">
            Les activités n’ont pas pu être chargées. Vérifiez votre connexion.
          </p>
          <Button variant="outline" onClick={() => queryClient.refetchQueries()}>
            Réessayer
          </Button>
        </div>
      )}

      {calcul && restitution.donnees && (
        <>
          <TotauxMois totaux={restitution.donnees.mois} natures={natures} />
          <BandeauAnomalies anomalies={restitution.donnees.mois.anomalies} />
          <Lignes
            calcul={calcul}
            natures={natures}
            filtre={filtre}
            adresseCourante={adresseCourante}
          />
        </>
      )}

      {/* Toujours visible, en bas de l'écran, à portée du pouce. */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3">
        <Button asChild size="lg" className="mx-auto flex w-full max-w-xl">
          <Link
            to={ADRESSES.nouvelleActivite}
            state={{ retour: adresseCourante } satisfies EtatNavigation}
          >
            Nouvelle activité
          </Link>
        </Button>
      </div>
    </main>
  )
}

function libelleNature(natures: readonly LigneNature[], natureId: string): string {
  return natures.find((nature) => nature.id === natureId)?.libelle ?? 'Nature inconnue'
}

// Totaux du mois entier (spécifications 2, règles « Totaux » et « Ventilation ») :
// ils ne suivent pas le filtre par nature. Montant et nombre d'activités par
// nature : activités « ok » (D-011) ; astreinte nette : part des heures du
// mois, « ok » et « taux manquant » (D-033, D-035) ; interventions : toutes,
// anomalies signalées (D-034).
function TotauxMois({
  totaux,
  natures,
}: {
  totaux: TotauxPeriode
  natures: readonly LigneNature[]
}) {
  // Nombre d'activités « ok » par nature, dans l'ordre du référentiel.
  const parNature = CATEGORIES.flatMap((categorie) => totaux.montants.parCategorie[categorie].parNature)
    .toSorted(
      (a, b) =>
        natures.findIndex((nature) => nature.id === a.natureId) -
        natures.findIndex((nature) => nature.id === b.natureId),
    )
  return (
    <section aria-label="Totaux du mois" className="rounded-md border p-3 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Montant total</dt>
        <dd className="text-right font-semibold">{formaterMontant(totaux.montants.totalCentimes)}</dd>
        <dt className="text-muted-foreground">Astreinte nette</dt>
        <dd className="text-right font-semibold">{formaterDuree(totaux.astreintes.dureeNetteMin)}</dd>
        <dt className="text-muted-foreground">Interventions</dt>
        <dd className="text-right">
          <NombreAvecAnomalies
            nombre={totaux.interventions.nombre}
            enAnomalie={totaux.interventions.enAnomalie}
          />
        </dd>
        {parNature.map((detail) => (
          <div key={detail.natureId} className="contents">
            <dt className="text-muted-foreground">{libelleNature(natures, detail.natureId)}</dt>
            <dd className="text-right">{detail.nombre}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Lignes({
  calcul,
  natures,
  filtre,
  adresseCourante,
}: {
  calcul: CalculPeriode
  natures: readonly LigneNature[]
  filtre: string | null
  adresseCourante: string
}) {
  if (calcul.activites.length === 0) {
    return <p className="text-muted-foreground">Aucune activité ce mois-ci</p>
  }

  const interventions = new Set(
    natures.filter((nature) => nature.est_intervention).map((nature) => nature.id),
  )
  // La plus récente en premier ; le filtre ne s'applique qu'aux lignes.
  const lignes = calcul.activites
    .map((activite, index) => ({ activite, resultat: calcul.resultats[index] }))
    .filter(({ activite }) =>
      filtre === null
        ? true
        : filtre === FILTRE_INTERVENTIONS
          ? interventions.has(activite.activity_type_id)
          : activite.activity_type_id === filtre,
    )
    .toReversed()

  if (lignes.length === 0) {
    return <p className="text-muted-foreground">Aucune activité de cette nature ce mois-ci</p>
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Activités du mois">
      {lignes.map(({ activite, resultat }) => (
        <li key={activite.id}>
          <LigneActivite
            activite={activite}
            resultat={resultat}
            nature={libelleNature(natures, activite.activity_type_id)}
            estIntervention={interventions.has(activite.activity_type_id)}
            adresseCourante={adresseCourante}
          />
        </li>
      ))}
    </ul>
  )
}

function LigneActivite({
  activite,
  resultat,
  nature,
  estIntervention,
  adresseCourante,
}: {
  activite: Activite
  resultat: ResultatActivite
  nature: string
  estIntervention: boolean
  adresseCourante: string
}) {
  return (
    <Link
      to={ADRESSES.activite(activite.id)}
      state={{ retour: adresseCourante } satisfies EtatNavigation}
      className="flex flex-col gap-1 rounded-md border p-3 text-sm hover:bg-muted"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{nature}</span>
        <span className="font-semibold">
          {resultat.montantCentimes === null ? '—' : formaterMontant(resultat.montantCentimes)}
        </span>
      </span>
      <span>{formaterPlage(new Date(activite.debut), new Date(activite.fin))}</span>
      <span className="text-muted-foreground">
        {resultat.estAstreinte
          ? `déclarée ${formaterDuree(resultat.dureeDeclareeMin)} · déduite ${formaterDuree(resultat.dureeDeduiteMin)} · nette ${formaterDuree(resultat.dureeNetteMin)}`
          : formaterDuree(resultat.dureeNetteMin)}
      </span>
      {(estIntervention || resultat.statut !== 'ok') && (
        <span className="flex flex-wrap gap-1">
          {estIntervention && <Badge variant="secondary">Intervention</Badge>}
          {resultat.statut !== 'ok' && (
            <Badge variant="destructive">{LIBELLES_ANOMALIE[resultat.statut]}</Badge>
          )}
        </span>
      )}
    </Link>
  )
}
