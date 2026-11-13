// Passage des lignes de la base (types générés dans src/types/database.ts)
// aux types du moteur de calcul (src/engine/). Fonctions pures : ni React,
// ni appel à Supabase.

import type { ActiviteEntree, HistoriqueGrade, Nature, Taux } from '@/engine'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
export type LigneActivite = Tables['activities']['Row']
export type LigneNature = Tables['activity_types']['Row']
export type LigneGrade = Tables['grades']['Row']
export type LigneTaux = Tables['reference_rates']['Row']
export type LigneHistoriqueGrade = Tables['user_grade_history']['Row']

// Écart toléré entre « taux × 100 » et l'entier le plus proche. Les nombres à
// virgule ne sont pas exacts en JavaScript (12,34 × 100 donne 1233,9999…) :
// en dessous de cette tolérance, l'écart est une imprécision de calcul et non
// une vraie troisième décimale.
const TOLERANCE_CENTIMES = 1e-6

/**
 * Convertit un taux horaire en euros (2 décimales au plus, colonne
 * `taux_horaire`) en centimes entiers, unité du moteur (D-012).
 * Un taux négatif, non numérique ou à plus de 2 décimales lève une erreur.
 */
export function tauxEnCentimes(tauxHoraire: number): number {
  if (!Number.isFinite(tauxHoraire) || tauxHoraire < 0) {
    throw new Error(`Taux horaire invalide : ${tauxHoraire}.`)
  }
  const centimes = Math.round(tauxHoraire * 100)
  if (Math.abs(tauxHoraire * 100 - centimes) > TOLERANCE_CENTIMES) {
    throw new Error(`Taux horaire à plus de 2 décimales : ${tauxHoraire}.`)
  }
  return centimes
}

/** Nature d'activité : seuls l'identifiant et l'indicateur d'astreinte servent au calcul. */
export function versNature(ligne: LigneNature): Nature {
  return { id: ligne.id, estAstreinte: ligne.est_astreinte }
}

/** Activité : les instants (timestamptz, texte ISO avec fuseau) deviennent des `Date`. */
export function versActivite(ligne: LigneActivite): ActiviteEntree {
  return {
    id: ligne.id,
    natureId: ligne.activity_type_id,
    debut: new Date(ligne.debut),
    fin: new Date(ligne.fin),
  }
}

/** Historique de grade : la date d'effet reste au format AAAA-MM-JJ. */
export function versHistoriqueGrade(ligne: LigneHistoriqueGrade): HistoriqueGrade {
  return { gradeId: ligne.grade_id, dateEffet: ligne.date_effet }
}

/** Taux du référentiel : euros → centimes entiers, date d'effet inchangée. */
export function versTaux(ligne: LigneTaux): Taux {
  return {
    gradeId: ligne.grade_id,
    natureId: ligne.activity_type_id,
    centimesParHeure: tauxEnCentimes(ligne.taux_horaire),
    dateEffet: ligne.date_effet,
  }
}
