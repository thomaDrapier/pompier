import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EtatLecture } from '@/components/communs'
import { BandeauAnomalies, DetailRemuneration, MentionIndicative } from '@/components/restitutions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { LigneNature } from '@/data/conversions'
import { donneesGraphique } from '@/data/restitutions'
import type { RestitutionHistorique } from '@/data/restitutions'
import {
  CATEGORIES,
  cleMois,
  cleSemaine,
  decalerMois,
  decalerSemaine,
  estCleMois,
  estCleSemaine,
  periodeMois,
  periodeSemaine,
} from '@/engine'
import type { ActiviteDetaillee, TotauxPeriode } from '@/engine'
import { useReferentiel } from '@/hooks/useReferentiel'
import {
  useRestitutionHistorique,
  useRestitutionMois,
  useRestitutionSemaine,
} from '@/hooks/useRestitutions'
import type { ModeHistorique } from '@/hooks/useRestitutions'
import {
  formaterMois,
  formaterMoisCourt,
  formaterMontant,
  formaterPlage,
  formaterPlageJours,
} from '@/lib/formats'
import {
  LIBELLES_CATEGORIES,
  texteAstreintesAChevalMontant,
  texteEcart,
  texteEcartCourt,
} from '@/lib/textes'
import { ADRESSES, adresseRemuneration } from '@/routes/adresses'
import type { EtatNavigation } from '@/routes/adresses'

type Vue = 'semaine' | 'mois' | 'historique'
type Mode = ModeHistorique['mode']

const LIBELLES_ANOMALIE = {
  taux_manquant: 'Taux manquant',
  chevauchement_astreintes: 'Chevauchement d’astreintes',
} as const

// Couleurs des catégories dans le graphique : variables de thème shadcn/ui,
// sans travail graphique (D-014). Les trois teintes les plus éloignées sont
// retenues ; la plus claire va aux « Autres activités ».
const COULEURS = {
  astreinte: 'var(--chart-2)',
  intervention: 'var(--chart-5)',
  autre: 'var(--chart-1)',
} as const

/** Période affichée, lue dans l'adresse ; une valeur invalide est remplacée par la période en cours. */
function lirePeriode(vue: Vue, mode: Mode, demandee: string | null, maintenant: Date): string {
  if (vue === 'semaine') return estCleSemaine(demandee) ? demandee : cleSemaine(maintenant)
  if (vue === 'historique' && mode === 'annee') {
    return demandee !== null && /^\d{4}$/.test(demandee) ? demandee : cleMois(maintenant).slice(0, 4)
  }
  return estCleMois(demandee) ? demandee : cleMois(maintenant)
}

// Rémunération — /remuneration (spécifications des écrans v1.3, section 9) :
// vues Semaine, Mois (par défaut) et Historique (12 derniers mois ou année
// civile). Vue, période et mode sont dans l'adresse
// (?vue=mois&periode=2026-11, ?vue=historique&mode=annee&periode=2026) : le
// bouton retour les conserve ; une valeur invalide est ignorée.
//
// Montants des activités « ok » uniquement (D-011), rattachés à la période
// de début (D-033). Tous les chiffres viennent du module de regroupement
// (src/hooks/useRestitutions.ts) : aucun calcul dans l'écran.
export function RemunerationScreen() {
  const [parametres, setParametres] = useSearchParams()
  // Période en cours à Paris, lue une seule fois à l'ouverture.
  const [maintenant] = useState(() => new Date())

  const vueDemandee = parametres.get('vue')
  const vue: Vue = vueDemandee === 'semaine' || vueDemandee === 'historique' ? vueDemandee : 'mois'
  const mode: Mode = parametres.get('mode') === 'annee' ? 'annee' : 'glissant'
  const periode = lirePeriode(vue, mode, parametres.get('periode'), maintenant)

  function aller(nouvelleVue: Vue, nouvellePeriode: string, nouveauMode: Mode = mode) {
    setParametres(
      nouvelleVue === 'historique'
        ? { vue: nouvelleVue, mode: nouveauMode, periode: nouvellePeriode }
        : { vue: nouvelleVue, periode: nouvellePeriode },
    )
  }

  // Changer de vue garde la période autant que possible.
  function changerVue(nouvelleVue: Vue) {
    if (nouvelleVue === vue) return
    const mois =
      vue === 'semaine'
        ? cleMois(periodeSemaine(periode).debut)
        : vue === 'mois'
          ? periode
          : cleMois(maintenant)
    if (nouvelleVue === 'semaine') aller('semaine', cleSemaine(periodeMois(mois).debut))
    else if (nouvelleVue === 'mois') aller('mois', mois)
    else aller('historique', mois, 'glissant')
  }

  function changerMode(nouveauMode: Mode) {
    if (nouveauMode === mode) return
    aller('historique', nouveauMode === 'annee' ? periode.slice(0, 4) : cleMois(maintenant), nouveauMode)
  }

  function decaler(ecart: number) {
    if (vue === 'semaine') aller(vue, decalerSemaine(periode, ecart))
    else if (vue === 'mois') aller(vue, decalerMois(periode, ecart))
    else if (mode === 'annee') aller(vue, String(Number(periode) + ecart))
    else aller(vue, decalerMois(periode, 12 * ecart))
  }

  const libelles = {
    semaine: ['Semaine précédente', 'Semaine suivante'],
    mois: ['Mois précédent', 'Mois suivant'],
    historique: mode === 'annee' ? ['Année précédente', 'Année suivante'] : ['Précédent', 'Suivant'],
  }[vue]

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Rémunération</h1>

      <div role="group" aria-label="Vue" className="flex flex-wrap gap-2">
        {(['semaine', 'mois', 'historique'] as const).map((choix) => (
          <Button
            key={choix}
            variant={choix === vue ? 'default' : 'outline'}
            size="sm"
            aria-pressed={choix === vue}
            onClick={() => changerVue(choix)}
          >
            {{ semaine: 'Semaine', mois: 'Mois', historique: 'Historique' }[choix]}
          </Button>
        ))}
      </div>

      {vue === 'historique' && (
        <div role="group" aria-label="Mode" className="flex flex-wrap gap-2">
          {(['glissant', 'annee'] as const).map((choix) => (
            <Button
              key={choix}
              variant={choix === mode ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={choix === mode}
              onClick={() => changerMode(choix)}
            >
              {choix === 'glissant' ? '12 derniers mois' : 'Année civile'}
            </Button>
          ))}
        </div>
      )}

      <nav aria-label="Période" className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => decaler(-1)}>
          {libelles[0]}
        </Button>
        <h2 className="text-center font-medium first-letter:uppercase">
          {titrePeriode(vue, mode, periode)}
        </h2>
        <Button variant="outline" onClick={() => decaler(1)}>
          {libelles[1]}
        </Button>
      </nav>

      {vue === 'semaine' && <VueSemaine cle={periode} />}
      {vue === 'mois' && <VueMois cle={periode} />}
      {vue === 'historique' && (
        <VueHistorique
          choix={mode === 'annee' ? { mode, annee: Number(periode) } : { mode, fin: periode }}
        />
      )}
    </main>
  )
}

function titrePeriode(vue: Vue, mode: Mode, periode: string): string {
  if (vue === 'semaine') {
    const semaine = periodeSemaine(periode)
    return `Semaine ${Number(periode.slice(-2))}, ${formaterPlageJours(semaine.debut, semaine.fin)}`
  }
  if (vue === 'mois') return formaterMois(periode)
  if (mode === 'annee') return periode
  return `${formaterMois(decalerMois(periode, -11))} – ${formaterMois(periode)}`
}

function useNatures(): readonly LigneNature[] {
  return useReferentiel().data?.natures ?? []
}

/** Total d'une période : détail dépliable, astreintes à cheval, mention indicative. */
function TotalPeriode({ totaux, children }: { totaux: TotauxPeriode; children?: React.ReactNode }) {
  const natures = useNatures()
  const aCheval = texteAstreintesAChevalMontant(totaux.aCheval.length)
  return (
    <>
      <BandeauAnomalies anomalies={totaux.anomalies} />
      <section aria-label="Total de la période" className="flex flex-col gap-1 rounded-md border p-3">
        <DetailRemuneration totaux={totaux} natures={natures} libelle="Total" />
        {children}
        <MentionIndicative />
      </section>
      {aCheval && <p className="text-sm text-muted-foreground">{aCheval}</p>}
    </>
  )
}

/** Vue Semaine : total, détail, activités qui commencent dans la semaine. */
function VueSemaine({ cle }: { cle: string }) {
  const restitution = useRestitutionSemaine(cle)
  const natures = useNatures()
  const location = useLocation()
  const retour = `${location.pathname}${location.search}`

  if (!restitution.donnees) {
    return <EtatLecture enChargement={restitution.enChargement} erreur={restitution.erreur !== null} />
  }
  const { semaine, activites } = restitution.donnees
  const finSemaine = semaine.periode.fin

  return (
    <>
      <TotalPeriode totaux={semaine} />
      {activites.length === 0 ? (
        <p className="text-muted-foreground">Aucune activité cette semaine.</p>
      ) : (
        <ul aria-label="Activités de la semaine" className="flex flex-col gap-2">
          {activites.map((activite) => (
            <li key={activite.resultat.id}>
              <LigneActivite
                activite={activite}
                nature={natures.find((n) => n.id === activite.resultat.natureId)?.libelle ?? ''}
                aCheval={activite.resultat.estAstreinte && activite.plages.declaree.fin > finSemaine}
                retour={retour}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function LigneActivite({
  activite,
  nature,
  aCheval,
  retour,
}: {
  activite: ActiviteDetaillee
  nature: string
  aCheval: boolean
  retour: string
}) {
  const { resultat, plages } = activite
  return (
    <Link
      to={ADRESSES.activite(resultat.id)}
      state={{ retour } satisfies EtatNavigation}
      className="flex flex-col gap-1 rounded-md border p-3 text-sm hover:bg-muted"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{nature}</span>
        <span className="font-semibold">
          {resultat.montantCentimes === null ? '—' : formaterMontant(resultat.montantCentimes)}
        </span>
      </span>
      <span>{formaterPlage(new Date(plages.declaree.debut), new Date(plages.declaree.fin))}</span>
      {resultat.statut !== 'ok' && (
        <Badge variant="destructive" className="self-start">
          {LIBELLES_ANOMALIE[resultat.statut]}
        </Badge>
      )}
      {aCheval && (
        <span className="text-muted-foreground">à cheval : montant compté sur la période de début</span>
      )}
    </Link>
  )
}

/** Vue Mois : total, écart avec le mois précédent, détail, une ligne par semaine ISO. */
function VueMois({ cle }: { cle: string }) {
  const restitution = useRestitutionMois(cle)
  if (!restitution.donnees) {
    return <EtatLecture enChargement={restitution.enChargement} erreur={restitution.erreur !== null} />
  }
  const { mois, ecart, semaines } = restitution.donnees

  return (
    <>
      <TotalPeriode totaux={mois}>
        <p className="text-sm">{texteEcart(ecart, decalerMois(cle, -1))}</p>
      </TotalPeriode>
      <ul aria-label="Semaines du mois" className="flex flex-col divide-y rounded-md border px-3">
        {semaines.map((semaine) => (
          <li key={semaine.periode.cle} className="flex flex-col gap-1 py-2">
            <span className="flex items-baseline justify-between gap-2">
              <span>Semaine {Number(semaine.periode.cle.slice(-2))}</span>
              <span className="font-medium">{formaterMontant(semaine.montants.totalCentimes)}</span>
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

/** Vue Historique : graphique en barres et tableau mois / total / écart. */
function VueHistorique({ choix }: { choix: ModeHistorique }) {
  const restitution = useRestitutionHistorique(choix)
  if (!restitution.donnees) {
    return <EtatLecture enChargement={restitution.enChargement} erreur={restitution.erreur !== null} />
  }
  const historique = restitution.donnees

  return (
    <>
      <BandeauAnomalies anomalies={historique.anomalies} />
      {choix.mode === 'annee' && (
        <section aria-label="Total de l’année" className="flex flex-col gap-1 rounded-md border p-3">
          <span className="flex items-baseline justify-between gap-2">
            <span>Total de l’année</span>
            <span className="font-semibold">{formaterMontant(historique.totalCentimes)}</span>
          </span>
          <MentionIndicative />
        </section>
      )}
      <Graphique historique={historique} />
      <TableauHistorique historique={historique} />
    </>
  )
}

function Graphique({ historique }: { historique: RestitutionHistorique }) {
  const donnees = donneesGraphique(historique, formaterMoisCourt)
  return (
    <figure aria-label="Rémunération par mois" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={donnees} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="libelle" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={48} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip formatter={(valeur) => formaterMontant(Math.round(Number(valeur) * 100))} />
          <Legend />
          {CATEGORIES.map((categorie) => (
            <Bar
              key={categorie}
              dataKey={categorie}
              name={LIBELLES_CATEGORIES[categorie]}
              stackId="mois"
              fill={COULEURS[categorie]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}

function TableauHistorique({ historique }: { historique: RestitutionHistorique }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Rémunération par mois</caption>
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th scope="col" className="py-1 font-normal">Mois</th>
          <th scope="col" className="py-1 text-right font-normal">Total</th>
          <th scope="col" className="py-1 text-right font-normal">Écart</th>
        </tr>
      </thead>
      <tbody>
        {historique.mois.map(({ cle, totaux, ecart }) => (
          <tr key={cle} className="border-b">
            <th scope="row" className="py-2 text-left font-normal">
              {/* Toucher un mois : vue Mois correspondante (spécifications 9.3). */}
              <Link to={adresseRemuneration('mois', cle)} className="capitalize underline">
                {formaterMois(cle)}
              </Link>
            </th>
            <td className="py-2 text-right">
              {totaux === null ? '' : formaterMontant(totaux.montants.totalCentimes)}
            </td>
            <td className="py-2 text-right">{ecart === null ? '' : texteEcartCourt(ecart)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
