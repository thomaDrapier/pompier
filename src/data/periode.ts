// Lecture des activités nécessaires au calcul d'une période.
//
// Logique indépendante de Supabase : les deux lectures sont fournies par une
// « source », ce qui permet de tester l'élargissement avec des données en
// mémoire.

import type { LigneActivite } from '@/data/conversions'

/** Période semi-ouverte [debut, fin). */
export interface Periode {
  debut: Date
  fin: Date
}

/** Les deux lectures dont a besoin le calcul d'une période. */
export interface SourceActivites {
  /** Astreintes dont le début est dans la période [debut, fin). */
  astreintesCommencantDans(periode: Periode): Promise<LigneActivite[]>
  /** Toutes les activités qui chevauchent la plage [debut, fin). */
  activitesChevauchant(plage: Periode): Promise<LigneActivite[]>
}

/**
 * Une activité appartient à la période où elle commence (hypothèse de 3.8 du
 * cahier des charges, retenue à titre provisoire pour le J1 ; la ventilation
 * au prorata est prévue au J3).
 */
export function estDansPeriode(debut: Date, periode: Periode): boolean {
  return debut.getTime() >= periode.debut.getTime() && debut.getTime() < periode.fin.getTime()
}

/**
 * Enveloppe de calcul d'une période :
 * [min(début de la période, débuts des astreintes), max(fin de la période, fins des astreintes)).
 *
 * Pour que la déduction d'une astreinte soit exacte (3.4), il faut connaître
 * toutes les activités qui la chevauchent, y compris celles qui commencent
 * avant la période ou après elle.
 */
export function enveloppeDeCalcul(
  periode: Periode,
  astreintes: readonly { debut: Date; fin: Date }[],
): Periode {
  let debut = periode.debut.getTime()
  let fin = periode.fin.getTime()
  for (const astreinte of astreintes) {
    debut = Math.min(debut, astreinte.debut.getTime())
    fin = Math.max(fin, astreinte.fin.getTime())
  }
  return { debut: new Date(debut), fin: new Date(fin) }
}

/**
 * Lit toutes les activités nécessaires au calcul d'une période :
 * 1. les astreintes qui commencent dans la période ;
 * 2. toutes les activités qui chevauchent l'enveloppe de la période et de ces
 *    astreintes.
 *
 * Le résultat contient donc aussi des activités hors période : une
 * intervention commencée la veille et terminée pendant une astreinte de la
 * période, ou une astreinte commencée dans la période précédente et qui
 * chevauche une astreinte de la période (anomalie à signaler, D-010).
 * L'appelant ne garde ensuite que les résultats des activités de la période.
 */
export async function lireActivitesPourCalcul(
  source: SourceActivites,
  periode: Periode,
): Promise<LigneActivite[]> {
  const astreintes = await source.astreintesCommencantDans(periode)
  const enveloppe = enveloppeDeCalcul(
    periode,
    astreintes.map((ligne) => ({ debut: new Date(ligne.debut), fin: new Date(ligne.fin) })),
  )
  return source.activitesChevauchant(enveloppe)
}
