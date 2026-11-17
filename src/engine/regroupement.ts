// Regroupement des activités calculées par période (restitutions du J3,
// cahier des charges 3.8).
//
// Le moteur (calculerActivitesDetaillees) calcule chaque activité une seule
// fois, sur l'ensemble des activités lues. Ce module ne fait que répartir ses
// résultats entre des périodes ; il ne recalcule ni durée nette ni montant.
//
// Règles :
// - Ventilation (D-033) : les durées déclarée, déduite et nette d'une
//   astreinte sont réparties sur chaque période traversée, par découpage
//   exact de ses plages aux limites de période. Une astreinte qui touche
//   plusieurs périodes est « à cheval ».
// - Rattachement (D-033, provisoire) : le montant d'une activité, et toute
//   activité qui n'est pas une astreinte (nombre, durée, montant), vont à la
//   période qui contient son début.
// - Totaux : montants des activités « ok » (D-011) ; durées d'astreinte des
//   statuts « ok » et « taux manquant » (D-035) ; interventions : toutes,
//   anomalies comptées à part (D-034).
//
// Unités : minutes et centimes entiers (D-012). Module pur.

import { duree, intersection } from './intervalles'
import type { Plage } from './intervalles'
import { periodeMois } from './periodes'
import type { PeriodeNommee } from './periodes'
import type {
  ActiviteDetaillee,
  CompteInterventions,
  DureesAstreinte,
  Nature,
  StatutActivite,
} from './types'

const MS_PAR_MINUTE = 60_000

/** Catégorie de rémunération d'une nature (spécifications des écrans, section 1). */
export type Categorie = 'astreinte' | 'intervention' | 'autre'

/** Les catégories, dans l'ordre d'affichage : Astreintes, Interventions, Autres activités. */
export const CATEGORIES: readonly Categorie[] = ['astreinte', 'intervention', 'autre']

/** Catégorie d'une nature : une nature n'est jamais astreinte et intervention à la fois (D-032). */
export function categorieDe(nature: Nature): Categorie {
  if (nature.estAstreinte) return 'astreinte'
  if (nature.estIntervention) return 'intervention'
  return 'autre'
}

/** Montant et nombre d'activités « ok » d'une nature. */
export interface MontantNature {
  natureId: string
  montantCentimes: number
  nombre: number
}

/** Montant et nombre d'activités « ok » d'une catégorie, avec le détail par nature. */
export interface MontantCategorie {
  montantCentimes: number
  nombre: number
  parNature: MontantNature[]
}

/** Durées d'astreinte d'une nature d'astreinte, dans la période. */
export interface DureesNature extends DureesAstreinte {
  natureId: string
}

/** Nombre d'interventions d'une nature, anomalies comprises (D-034). */
export interface InterventionsNature extends CompteInterventions {
  natureId: string
}

/** Totaux d'une période. */
export interface TotauxPeriode {
  periode: PeriodeNommee
  /** Montants des activités « ok » qui commencent dans la période (D-011, D-033). */
  montants: {
    totalCentimes: number
    parCategorie: Record<Categorie, MontantCategorie>
  }
  /**
   * Durées d'astreinte de la période : part des astreintes qui s'y déroule
   * (D-033), statuts « ok » et « taux manquant » (D-035).
   */
  astreintes: DureesAstreinte & { parNature: DureesNature[] }
  /** Interventions qui commencent dans la période, toutes (D-034). */
  interventions: CompteInterventions & { parNature: InterventionsNature[] }
  /** Activités en anomalie qui commencent dans la période, par statut. */
  anomalies: { taux_manquant: number; chevauchement_astreintes: number }
  /**
   * Astreintes comptées dans les durées de la période qui la débordent :
   * elles commencent avant ou finissent après elle (« à cheval », D-033).
   */
  aCheval: string[]
  /** Activités qui commencent dans la période, par début croissant. */
  activites: string[]
}

function dureeDans(plages: readonly Plage[], periode: Plage): number {
  return duree(intersection(plages, [periode])) / MS_PAR_MINUTE
}

function commenceDans(detaillee: ActiviteDetaillee, periode: Plage): boolean {
  const debut = detaillee.plages.declaree.debut
  return debut >= periode.debut && debut < periode.fin
}

function totauxVides(periode: PeriodeNommee): TotauxPeriode {
  const categorie = (): MontantCategorie => ({ montantCentimes: 0, nombre: 0, parNature: [] })
  return {
    periode,
    montants: {
      totalCentimes: 0,
      parCategorie: { astreinte: categorie(), intervention: categorie(), autre: categorie() },
    },
    astreintes: { dureeDeclareeMin: 0, dureeDeduiteMin: 0, dureeNetteMin: 0, parNature: [] },
    interventions: { nombre: 0, enAnomalie: 0, parNature: [] },
    anomalies: { taux_manquant: 0, chevauchement_astreintes: 0 },
    aCheval: [],
    activites: [],
  }
}

/** Élément d'une liste « par nature », créé à la première rencontre. */
function detailDe<T extends { natureId: string }>(
  liste: T[],
  natureId: string,
  creer: () => T,
): T {
  let detail = liste.find((element) => element.natureId === natureId)
  if (detail === undefined) {
    detail = creer()
    liste.push(detail)
  }
  return detail
}

/**
 * Totaux d'une période.
 *
 * @param activites toutes les activités calculées par le moteur (elles
 *   peuvent déborder de la période : seule leur part utile est comptée)
 * @param natures natures du référentiel ; les détails « par nature » suivent
 *   leur ordre
 */
export function totaliserPeriode(
  activites: readonly ActiviteDetaillee[],
  natures: readonly Nature[],
  periode: PeriodeNommee,
): TotauxPeriode {
  const naturesParId = new Map(natures.map((nature) => [nature.id, nature]))
  const rang = new Map(natures.map((nature, index) => [nature.id, index]))
  const totaux = totauxVides(periode)

  const triees = activites.toSorted(
    (a, b) => a.plages.declaree.debut - b.plages.declaree.debut,
  )

  for (const detaillee of triees) {
    const { resultat, plages } = detaillee
    const nature = naturesParId.get(resultat.natureId)
    if (nature === undefined) {
      throw new Error(`Activité ${resultat.id} : nature inconnue (${resultat.natureId}).`)
    }
    const statut: StatutActivite = resultat.statut

    // 1. Ventilation des durées d'astreinte (D-033), statuts « ok » et
    //    « taux manquant » (D-035).
    if (nature.estAstreinte && statut !== 'chevauchement_astreintes') {
      const declaree = dureeDans([plages.declaree], periode)
      if (declaree > 0) {
        const deduite = dureeDans(plages.deduites, periode)
        const nette = dureeDans(plages.nettes, periode)
        totaux.astreintes.dureeDeclareeMin += declaree
        totaux.astreintes.dureeDeduiteMin += deduite
        totaux.astreintes.dureeNetteMin += nette
        const detail = detailDe(totaux.astreintes.parNature, nature.id, () => ({
          natureId: nature.id,
          dureeDeclareeMin: 0,
          dureeDeduiteMin: 0,
          dureeNetteMin: 0,
        }))
        detail.dureeDeclareeMin += declaree
        detail.dureeDeduiteMin += deduite
        detail.dureeNetteMin += nette
        if (plages.declaree.debut < periode.debut || plages.declaree.fin > periode.fin) {
          totaux.aCheval.push(resultat.id)
        }
      }
    }

    // 2. Rattachement à la période de début (D-033).
    if (!commenceDans(detaillee, periode)) continue
    totaux.activites.push(resultat.id)

    if (nature.estIntervention) {
      const enAnomalie = statut === 'ok' ? 0 : 1
      totaux.interventions.nombre += 1
      totaux.interventions.enAnomalie += enAnomalie
      const detail = detailDe(totaux.interventions.parNature, nature.id, () => ({
        natureId: nature.id,
        nombre: 0,
        enAnomalie: 0,
      }))
      detail.nombre += 1
      detail.enAnomalie += enAnomalie
    }

    if (statut !== 'ok') {
      totaux.anomalies[statut] += 1
      continue
    }

    // Montants : activités « ok » seulement (D-011).
    const montant = resultat.montantCentimes ?? 0
    const categorie = totaux.montants.parCategorie[categorieDe(nature)]
    totaux.montants.totalCentimes += montant
    categorie.montantCentimes += montant
    categorie.nombre += 1
    const detail = detailDe(categorie.parNature, nature.id, () => ({
      natureId: nature.id,
      montantCentimes: 0,
      nombre: 0,
    }))
    detail.montantCentimes += montant
    detail.nombre += 1
  }

  // Détails « par nature » dans l'ordre du référentiel.
  const parRang = (a: { natureId: string }, b: { natureId: string }) =>
    (rang.get(a.natureId) ?? 0) - (rang.get(b.natureId) ?? 0)
  totaux.astreintes.parNature.sort(parRang)
  totaux.interventions.parNature.sort(parRang)
  for (const categorie of CATEGORIES) totaux.montants.parCategorie[categorie].parNature.sort(parRang)

  return totaux
}

/** Totaux de plusieurs périodes, dans l'ordre reçu. */
export function regrouper(
  activites: readonly ActiviteDetaillee[],
  natures: readonly Nature[],
  periodes: readonly PeriodeNommee[],
): TotauxPeriode[] {
  return periodes.map((periode) => totaliserPeriode(activites, natures, periode))
}

/** Écart d'un montant avec celui de la période précédente. */
export interface Ecart {
  /** Écart en centimes (négatif en cas de baisse). */
  centimes: number
  /**
   * Écart en pourcentage, arrondi à l'unité (le demi vers le haut) ; null si
   * la période précédente vaut 0 (pourcentage sans objet).
   */
  pourcentage: number | null
}

/**
 * Écart entre deux montants : « +42,50 € (+8 %) ». Calcul en entiers :
 * arrondi(100 × écart / précédent) = ⌊(200 × écart + précédent) / (2 × précédent)⌋.
 */
export function ecart(courantCentimes: number, precedentCentimes: number): Ecart {
  const centimes = courantCentimes - precedentCentimes
  if (precedentCentimes === 0) return { centimes, pourcentage: null }
  return {
    centimes,
    pourcentage: Math.floor((200 * centimes + precedentCentimes) / (2 * precedentCentimes)),
  }
}

/**
 * Totaux mensuels d'un historique (12 mois glissants ou année civile). Un
 * mois postérieur au mois courant est « à vide » : null.
 *
 * @param mois clés « AAAA-MM » (moisGlissants, moisDeLAnnee), dans l'ordre d'affichage
 * @param moisCourant clé du mois en cours (Paris)
 */
export function historiqueMensuel(
  activites: readonly ActiviteDetaillee[],
  natures: readonly Nature[],
  mois: readonly string[],
  moisCourant: string,
): (TotauxPeriode | null)[] {
  // Les clés « AAAA-MM » se comparent directement comme du texte.
  return mois.map((cle) =>
    cle > moisCourant ? null : totaliserPeriode(activites, natures, periodeMois(cle)),
  )
}
