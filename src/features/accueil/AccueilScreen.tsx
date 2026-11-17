import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EtatLecture } from '@/components/communs'
import { BandeauAnomalies, Depliable, NombreAvecAnomalies } from '@/components/restitutions'
import { dateParis, gradeALaDate } from '@/data/affichage-referentiel'
import type { LigneNature } from '@/data/conversions'
import { CATEGORIES, cleMois } from '@/engine'
import type { TotauxPeriode } from '@/engine'
import { useHistoriqueGrades } from '@/hooks/useHistoriqueGrades'
import { useReferentiel } from '@/hooks/useReferentiel'
import { useRestitutionMois } from '@/hooks/useRestitutions'
import { formaterDuree, formaterMois, formaterMontant } from '@/lib/formats'
import { LIBELLES_CATEGORIES, compter, texteAstreintesAChevalMois } from '@/lib/textes'
import { ADRESSES } from '@/routes/adresses'
import type { EtatNavigation } from '@/routes/adresses'

// Accueil — /accueil (spécifications des écrans v1.3, section 7) : l'essentiel
// du mois en cours (heure de Paris), sans navigation entre les mois.
//
// Tous les chiffres viennent du module de regroupement (useRestitutionMois) :
// aucun calcul dans l'écran. Astreinte nette : part des heures du mois
// (D-033), astreintes « ok » et « taux manquant » (D-035). Interventions :
// toutes, anomalies signalées (D-034). Rémunération : activités « ok » (D-011).
export function AccueilScreen() {
  // Mois et jour en cours à Paris, lus une seule fois à l'ouverture.
  const [maintenant] = useState(() => new Date())
  const mois = cleMois(maintenant)
  const restitution = useRestitutionMois(mois)
  const referentiel = useReferentiel()
  const historique = useHistoriqueGrades()

  const natures = referentiel.data?.natures ?? []
  const totaux = restitution.donnees?.mois ?? null
  const sansGrade =
    historique.data !== undefined && gradeALaDate(historique.data, dateParis(maintenant)) === null

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl font-semibold">Accueil</h1>
      <h2 className="font-medium capitalize">{formaterMois(mois)}</h2>

      {sansGrade && (
        <p className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
          Renseignez votre grade dans{' '}
          <Link to={ADRESSES.parametres} className="underline">
            Paramètres
          </Link>{' '}
          pour calculer vos montants.
        </p>
      )}

      <EtatLecture enChargement={restitution.enChargement} erreur={restitution.erreur !== null} />

      {totaux && <SyntheseMois totaux={totaux} natures={natures} />}

      <Link to={ADRESSES.activites} className="self-start text-sm underline">
        Voir les activités du mois
      </Link>

      {/* Toujours visible, en bas de l'écran, à portée du pouce. */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3">
        <Button asChild size="lg" className="mx-auto flex w-full max-w-xl">
          <Link
            to={ADRESSES.nouvelleActivite}
            state={{ retour: ADRESSES.accueil } satisfies EtatNavigation}
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

function SyntheseMois({
  totaux,
  natures,
}: {
  totaux: TotauxPeriode
  natures: readonly LigneNature[]
}) {
  const aCheval = texteAstreintesAChevalMois(totaux.aCheval.length)
  const vide = totaux.activites.length === 0 && totaux.astreintes.dureeDeclareeMin === 0

  return (
    <>
      <BandeauAnomalies anomalies={totaux.anomalies} />

      <section aria-label="Synthèse du mois" className="flex flex-col gap-2 rounded-md border p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span>Astreinte nette</span>
          <span className="font-semibold">{formaterDuree(totaux.astreintes.dureeNetteMin)}</span>
        </div>

        <Depliable
          libelle="Interventions"
          valeur={
            <NombreAvecAnomalies
              nombre={totaux.interventions.nombre}
              enAnomalie={totaux.interventions.enAnomalie}
            />
          }
        >
          {totaux.interventions.parNature.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune intervention.</p>
          )}
          {totaux.interventions.parNature.map((detail) => (
            <div key={detail.natureId} className="flex justify-between gap-2 text-sm">
              <span>{libelleNature(natures, detail.natureId)}</span>
              <NombreAvecAnomalies nombre={detail.nombre} enAnomalie={detail.enAnomalie} />
            </div>
          ))}
        </Depliable>

        <Depliable
          libelle="Rémunération"
          valeur={<span className="font-semibold">{formaterMontant(totaux.montants.totalCentimes)}</span>}
        >
          {CATEGORIES.map((categorie) => {
            const detail = totaux.montants.parCategorie[categorie]
            return (
              <Depliable
                key={categorie}
                className="text-sm"
                libelle={LIBELLES_CATEGORIES[categorie]}
                valeur={formaterMontant(detail.montantCentimes)}
              >
                {detail.parNature.length === 0 && (
                  <p className="text-muted-foreground">Aucune activité.</p>
                )}
                {detail.parNature.map((nature) => (
                  <div key={nature.natureId} className="flex justify-between gap-2">
                    <span>
                      {libelleNature(natures, nature.natureId)} ·{' '}
                      {compter(nature.nombre, 'activité')}
                    </span>
                    <span>{formaterMontant(nature.montantCentimes)}</span>
                  </div>
                ))}
              </Depliable>
            )
          })}
        </Depliable>
      </section>

      {aCheval && <p className="text-sm text-muted-foreground">{aCheval}</p>}

      {vide && <p className="text-muted-foreground">Aucune activité ce mois-ci.</p>}
    </>
  )
}
