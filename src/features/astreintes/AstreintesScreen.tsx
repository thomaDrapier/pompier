import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { EtatLecture } from '@/components/communs'
import { BandeauAnomalies, Depliable } from '@/components/restitutions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { LigneNature } from '@/data/conversions'
import {
  cleMois,
  cleSemaine,
  decalerMois,
  decalerSemaine,
  estCleMois,
  estCleSemaine,
  periodeMois,
  periodeSemaine,
} from '@/engine'
import type { PartAstreinte, TotauxPeriode } from '@/engine'
import { useReferentiel } from '@/hooks/useReferentiel'
import { useRestitutionMois, useRestitutionSemaine } from '@/hooks/useRestitutions'
import { formaterDate, formaterMois, formaterPlage, formaterPlageJours } from '@/lib/formats'
import { texteDureesAstreinte } from '@/lib/textes'
import { cn } from '@/lib/utils'
import { ADRESSES } from '@/routes/adresses'
import type { EtatNavigation } from '@/routes/adresses'

type Vue = 'semaine' | 'mois'

// Astreintes — /astreintes (spécifications des écrans v1.3, section 8) :
// durées déclarée, déduite et nette, vue Semaine (par défaut) ou Mois.
//
// La vue et la période sont dans l'adresse (?vue=semaine&periode=2026-W47,
// ?vue=mois&periode=2026-11) : elles sont conservées par le bouton retour ;
// une valeur invalide est ignorée (période en cours). Les durées viennent
// du module de regroupement (useRestitutionSemaine, useRestitutionMois) :
// part des heures dans chaque période (D-033), astreintes « ok » et « taux
// manquant » (D-035) ; celles en chevauchement sont exclues, avec le bandeau.
export function AstreintesScreen() {
  const [parametres, setParametres] = useSearchParams()
  // Semaine et mois en cours à Paris, lus une seule fois à l'ouverture.
  const [maintenant] = useState(() => new Date())

  const vue: Vue = parametres.get('vue') === 'mois' ? 'mois' : 'semaine'
  const demandee = parametres.get('periode')
  const cle =
    vue === 'mois'
      ? estCleMois(demandee)
        ? demandee
        : cleMois(maintenant)
      : estCleSemaine(demandee)
        ? demandee
        : cleSemaine(maintenant)

  function aller(nouvelleVue: Vue, periode: string) {
    setParametres({ vue: nouvelleVue, periode })
  }

  // Changer de vue garde la période : le mois qui contient le lundi de la
  // semaine, ou la semaine qui contient le 1er du mois.
  function changerVue(nouvelleVue: Vue) {
    if (nouvelleVue === vue) return
    aller(
      nouvelleVue,
      nouvelleVue === 'mois' ? cleMois(periodeSemaine(cle).debut) : cleSemaine(periodeMois(cle).debut),
    )
  }

  const decaler = vue === 'mois' ? decalerMois : decalerSemaine
  const titre =
    vue === 'mois'
      ? formaterMois(cle)
      : `Semaine ${Number(cle.slice(-2))}, ${formaterPlageJours(
          periodeSemaine(cle).debut,
          periodeSemaine(cle).fin,
        )}`

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Astreintes</h1>

      <div role="group" aria-label="Vue" className="flex gap-2">
        {(['semaine', 'mois'] as const).map((choix) => (
          <Button
            key={choix}
            variant={choix === vue ? 'default' : 'outline'}
            size="sm"
            aria-pressed={choix === vue}
            onClick={() => changerVue(choix)}
          >
            {choix === 'semaine' ? 'Semaine' : 'Mois'}
          </Button>
        ))}
      </div>

      <nav aria-label="Période" className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => aller(vue, decaler(cle, -1))}>
          {vue === 'mois' ? 'Mois précédent' : 'Semaine précédente'}
        </Button>
        <h2 className="text-center font-medium first-letter:uppercase">{titre}</h2>
        <Button variant="outline" onClick={() => aller(vue, decaler(cle, 1))}>
          {vue === 'mois' ? 'Mois suivant' : 'Semaine suivante'}
        </Button>
      </nav>

      {vue === 'semaine' ? <VueSemaine cle={cle} /> : <VueMois cle={cle} />}
    </main>
  )
}

function libelleNature(natures: readonly LigneNature[], natureId: string): string {
  return natures.find((nature) => nature.id === natureId)?.libelle ?? 'Nature inconnue'
}

/** Totaux de la période, détail par nature d'astreinte s'il y en a plusieurs, bandeau, période vide. */
function TotauxAstreintes({ totaux }: { totaux: TotauxPeriode }) {
  const natures = useReferentiel().data?.natures ?? []
  return (
    <>
      {/* Seules les astreintes en chevauchement sont exclues des durées (D-035). */}
      <BandeauAnomalies
        anomalies={{ taux_manquant: 0, chevauchement_astreintes: totaux.anomalies.chevauchement_astreintes }}
      />
      <section aria-label="Totaux de la période" className="flex flex-col gap-1 rounded-md border p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-muted-foreground">Déclarée · déduite · nette</span>
          <span className="font-semibold">{texteDureesAstreinte(totaux.astreintes)}</span>
        </div>
        {totaux.astreintes.parNature.length > 1 &&
          totaux.astreintes.parNature.map((detail) => (
            <div key={detail.natureId} className="flex justify-between gap-2 text-sm">
              <span>{libelleNature(natures, detail.natureId)}</span>
              <span>{texteDureesAstreinte(detail)}</span>
            </div>
          ))}
      </section>
      {totaux.astreintes.dureeDeclareeMin === 0 && (
        <p className="text-muted-foreground">Aucune astreinte sur cette période.</p>
      )}
    </>
  )
}

/** Vue Semaine : une ligne par jour, du lundi au dimanche, dépliable en astreintes. */
function VueSemaine({ cle }: { cle: string }) {
  const restitution = useRestitutionSemaine(cle)
  const location = useLocation()
  const natures = useReferentiel().data?.natures ?? []
  const retour = `${location.pathname}${location.search}`

  if (!restitution.donnees) {
    return <EtatLecture enChargement={restitution.enChargement} erreur={restitution.erreur !== null} />
  }
  const { semaine, jours, astreintesParJour } = restitution.donnees

  return (
    <>
      <TotauxAstreintes totaux={semaine} />
      <ul aria-label="Jours de la semaine" className="flex flex-col divide-y rounded-md border px-3">
        {jours.map((jour, index) => (
          <li key={jour.periode.cle} className="py-1">
            <Depliable
              libelle={<span className="first-letter:uppercase">{formaterDate(new Date(jour.periode.debut))}</span>}
              valeur={<span className="text-sm">{texteDureesAstreinte(jour.astreintes)}</span>}
            >
              {astreintesParJour[index].length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune astreinte ce jour.</p>
              )}
              {astreintesParJour[index].map((part) => (
                <AstreinteDuJour
                  key={part.id}
                  part={part}
                  nature={libelleNature(natures, part.natureId)}
                  retour={retour}
                />
              ))}
            </Depliable>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Une astreinte dans le détail d'un jour : horaires, durées de la part du jour, « à cheval ». */
function AstreinteDuJour({
  part,
  nature,
  retour,
}: {
  part: PartAstreinte
  nature: string
  retour: string
}) {
  return (
    <div className="flex flex-col gap-1 py-1 text-sm">
      <span className="flex flex-wrap items-baseline gap-2">
        <span className="font-medium">{nature}</span>
        {part.aCheval && <Badge variant="secondary">à cheval</Badge>}
      </span>
      <span>{formaterPlage(new Date(part.debut), new Date(part.fin))}</span>
      <span className="text-muted-foreground">
        Part du jour : {texteDureesAstreinte(part)}
      </span>
      <Link
        to={ADRESSES.activite(part.id)}
        state={{ retour } satisfies EtatNavigation}
        className="self-start underline"
      >
        Modifier l’astreinte
      </Link>
    </div>
  )
}

/** Vue Mois : une ligne par semaine ISO, limitée au mois. */
function VueMois({ cle }: { cle: string }) {
  const restitution = useRestitutionMois(cle)

  if (!restitution.donnees) {
    return <EtatLecture enChargement={restitution.enChargement} erreur={restitution.erreur !== null} />
  }
  const { mois, semaines } = restitution.donnees

  return (
    <>
      <TotauxAstreintes totaux={mois} />
      <ul aria-label="Semaines du mois" className="flex flex-col divide-y rounded-md border px-3">
        {semaines.map((semaine) => (
          <li key={semaine.periode.cle} className="flex flex-col gap-1 py-2">
            <span className="flex items-baseline justify-between gap-2">
              <span>Semaine {Number(semaine.periode.cle.slice(-2))}</span>
              <span className={cn('text-sm', semaine.astreintes.dureeDeclareeMin > 0 && 'font-medium')}>
                {texteDureesAstreinte(semaine.astreintes)}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">
              {formaterPlageJours(semaine.periode.debut, semaine.periode.fin)}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
