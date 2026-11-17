// Éléments communs aux écrans de restitution (Accueil, Activités, Astreintes,
// Rémunération) : détail dépliable, chiffre d'interventions avec anomalies,
// bandeau d'anomalie. Composants shadcn/ui par défaut, sans travail
// graphique (D-014).

import { useId, useState, type ReactNode } from 'react'
import { CATEGORIES } from '@/engine'
import type { TotauxPeriode } from '@/engine'
import { formaterMontant } from '@/lib/formats'
import {
  LIBELLES_CATEGORIES,
  compter,
  texteActivitesNonComptees,
  texteDontAnomalies,
} from '@/lib/textes'
import { cn } from '@/lib/utils'

/**
 * Ligne dépliable (spécifications, règles communes) : un toucher affiche le
 * détail sous la ligne, un second le replie. Le bouton porte aria-expanded.
 */
export function Depliable({
  libelle,
  valeur,
  children,
  className,
}: {
  libelle: ReactNode
  valeur: ReactNode
  children: ReactNode
  className?: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const id = useId()
  return (
    <div className={cn('flex flex-col', className)}>
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        className="flex items-baseline justify-between gap-2 py-1 text-left"
        onClick={() => setOuvert((o) => !o)}
      >
        <span className="flex items-baseline gap-1">
          <span aria-hidden="true" className="text-muted-foreground">
            {ouvert ? '▾' : '▸'}
          </span>
          {libelle}
        </span>
        <span className="text-right">{valeur}</span>
      </button>
      {ouvert && (
        <div id={id} className="flex flex-col gap-1 border-l pl-4">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Nombre d'interventions selon la règle « Anomalies » (D-034) : s'il inclut
 * des anomalies, il est mis en évidence (rouge) et précisé par « dont N en
 * anomalie ».
 */
export function NombreAvecAnomalies({ nombre, enAnomalie }: { nombre: number; enAnomalie: number }) {
  if (enAnomalie === 0) return <span className="font-semibold">{nombre}</span>
  return (
    <span className="font-semibold text-destructive">
      {nombre} <span className="text-sm font-normal">({texteDontAnomalies(enAnomalie)})</span>
    </span>
  )
}

/** Bandeau « N activité(s) non comptée(s) : … », s'il y a au moins une anomalie. */
export function BandeauAnomalies({
  anomalies,
}: {
  anomalies: { taux_manquant: number; chevauchement_astreintes: number }
}) {
  const texte = texteActivitesNonComptees(anomalies)
  if (texte === null) return null
  return (
    <p role="alert" className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
      {texte}
    </p>
  )
}

/**
 * Rémunération d'une période (activités « ok », D-011), dépliable en
 * catégories (Astreintes / Interventions / Autres activités), puis chaque
 * catégorie en natures, avec montant et nombre d'activités.
 */
export function DetailRemuneration({
  totaux,
  natures,
  libelle = 'Rémunération',
}: {
  totaux: TotauxPeriode
  natures: readonly { id: string; libelle: string }[]
  libelle?: string
}) {
  const libelleNature = (id: string) =>
    natures.find((nature) => nature.id === id)?.libelle ?? 'Nature inconnue'
  return (
    <Depliable
      libelle={libelle}
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
            {detail.parNature.length === 0 && <p className="text-muted-foreground">Aucune activité.</p>}
            {detail.parNature.map((nature) => (
              <div key={nature.natureId} className="flex justify-between gap-2">
                <span>
                  {libelleNature(nature.natureId)} · {compter(nature.nombre, 'activité')}
                </span>
                <span>{formaterMontant(nature.montantCentimes)}</span>
              </div>
            ))}
          </Depliable>
        )
      })}
    </Depliable>
  )
}

/** Mention commune sous chaque total de rémunération (spécifications 9). */
export function MentionIndicative() {
  return (
    <p className="text-xs text-muted-foreground">
      Montants indicatifs, calculés à partir du référentiel.
    </p>
  )
}
