import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CalculPeriode } from '@/data/calcul'
import type { LigneActivite as Activite, LigneNature } from '@/data/conversions'
import type { ResultatActivite } from '@/engine'
import { useCalculPeriode } from '@/hooks/useCalculPeriode'
import { useReferentiel } from '@/hooks/useReferentiel'
import { formaterDuree, formaterMois, formaterMontant, formaterPlage } from '@/lib/formats'
import { bornesDuMois, estMoisValide, moisDe, moisPrecedent, moisSuivant } from '@/lib/temps'
import { ADRESSES, adresseListe, lireEtatNavigation } from '@/routes/adresses'
import type { EtatNavigation } from '@/routes/adresses'

const LIBELLES_ANOMALIE = {
  taux_manquant: 'Taux manquant',
  chevauchement_astreintes: 'Chevauchement d’astreintes',
} as const

// Liste des activités d'un mois (spécifications des écrans, section 2).
// Le mois et le filtre sont dans l'adresse (?mois=2026-06&nature=…) : ils sont
// conservés par le bouton « retour » et au retour d'un autre écran.
// Toutes les durées nettes et tous les montants viennent du moteur de calcul
// (useCalculPeriode) : rien n'est recalculé ici.
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
  const natureDemandee = parametres.get('nature')
  const filtre = natures.some((nature) => nature.id === natureDemandee) ? natureDemandee : null

  const periode = useMemo(() => bornesDuMois(mois), [mois])
  const { calcul, enChargement, erreur } = useCalculPeriode(periode)

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
          {natures.map((nature) => (
            <option key={nature.id} value={nature.id}>
              {nature.libelle}
            </option>
          ))}
        </select>
      </div>

      {enChargement && (
        <p role="status" className="text-muted-foreground">
          Chargement…
        </p>
      )}

      {erreur && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-destructive">
            Les activités n’ont pas pu être chargées. Vérifiez votre connexion.
          </p>
          <Button variant="outline" onClick={() => queryClient.refetchQueries()}>
            Réessayer
          </Button>
        </div>
      )}

      {calcul && (
        <>
          <TotauxMois calcul={calcul} natures={natures} />
          <BandeauAnomalies calcul={calcul} />
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

// Totaux du mois entier : ils ne suivent pas le filtre par nature et ne
// comptent que les activités au statut « ok » (D-011).
function TotauxMois({
  calcul,
  natures,
}: {
  calcul: CalculPeriode
  natures: readonly LigneNature[]
}) {
  const { totaux } = calcul
  return (
    <section aria-label="Totaux du mois" className="rounded-md border p-3 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Montant total</dt>
        <dd className="text-right font-semibold">{formaterMontant(totaux.montantCentimes)}</dd>
        <dt className="text-muted-foreground">Astreinte nette</dt>
        <dd className="text-right font-semibold">
          {formaterDuree(totaux.astreintes.dureeNetteMin)}
        </dd>
        {totaux.parNature.map((detail) => (
          <div key={detail.natureId} className="contents">
            <dt className="text-muted-foreground">{libelleNature(natures, detail.natureId)}</dt>
            <dd className="text-right">{detail.nombre}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// « N activité(s) non comptée(s) : taux manquant (x), chevauchement d'astreintes (y) »
function BandeauAnomalies({ calcul }: { calcul: CalculPeriode }) {
  const { taux_manquant: tauxManquant, chevauchement_astreintes: chevauchement } =
    calcul.totaux.anomalies
  const total = tauxManquant + chevauchement
  if (total === 0) return null

  const details = [
    tauxManquant > 0 ? `taux manquant (${tauxManquant})` : null,
    chevauchement > 0 ? `chevauchement d’astreintes (${chevauchement})` : null,
  ].filter((detail) => detail !== null)

  return (
    <p role="alert" className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
      {total === 1 ? '1 activité non comptée' : `${total} activités non comptées`} :{' '}
      {details.join(', ')}
    </p>
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

  // La plus récente en premier ; le filtre ne s'applique qu'aux lignes.
  const lignes = calcul.activites
    .map((activite, index) => ({ activite, resultat: calcul.resultats[index] }))
    .filter(({ activite }) => filtre === null || activite.activity_type_id === filtre)
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
  adresseCourante,
}: {
  activite: Activite
  resultat: ResultatActivite
  nature: string
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
      {resultat.statut !== 'ok' && (
        <Badge variant="destructive">{LIBELLES_ANOMALIE[resultat.statut]}</Badge>
      )}
    </Link>
  )
}
