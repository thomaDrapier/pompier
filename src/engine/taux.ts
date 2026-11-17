// Résolution du taux horaire applicable à une activité (cahier des charges 3.5).
//
// Aucun taux n'est écrit dans ce fichier : les taux et l'historique des grades
// sont toujours passés en paramètre et viennent du référentiel unique.

import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import type { HistoriqueGrade, Taux } from './types'

const FUSEAU = 'Europe/Paris'

/**
 * Date calendaire d'un instant en Europe/Paris, au format AAAA-MM-JJ.
 *
 * C'est la date de référence pour choisir le grade et le taux. Elle ne dépend
 * ni du fuseau de l'appareil ni de l'UTC : le 01/01 à 00:30 à Paris est bien
 * le 1er janvier, alors qu'il est encore 23:30 le 31/12 en UTC.
 */
export function dateParis(instant: Date): string {
  return format(new TZDate(instant.getTime(), FUSEAU), 'yyyy-MM-dd')
}

/** Toute ligne datée : historique de grade, taux du référentiel… */
export interface LigneDatee {
  /** Date d'effet au format AAAA-MM-JJ (date calendaire, Europe/Paris). */
  dateEffet: string
}

/**
 * Ligne en vigueur à une date : celle dont la date d'effet est la plus récente
 * parmi celles antérieures ou égales à la date. Renvoie null si aucune ligne
 * n'est en vigueur (toutes sont futures, ou la liste est vide).
 *
 * C'est la règle unique du moteur pour le grade (historique) comme pour le
 * taux (référentiel) : un nouveau taux ou un nouveau grade n'écrase jamais
 * l'ancien, il s'applique à partir de sa date d'effet.
 *
 * Les dates AAAA-MM-JJ se comparent directement comme du texte.
 */
export function ligneEnVigueur<T extends LigneDatee>(lignes: readonly T[], date: string): T | null {
  let retenue: T | null = null
  for (const ligne of lignes) {
    if (ligne.dateEffet <= date && (retenue === null || ligne.dateEffet >= retenue.dateEffet)) {
      retenue = ligne
    }
  }
  return retenue
}

/**
 * Prochaine ligne : celle dont la date d'effet est la plus proche parmi celles
 * strictement postérieures à la date. Renvoie null s'il n'y en a aucune.
 */
export function prochaineLigne<T extends LigneDatee>(lignes: readonly T[], date: string): T | null {
  let retenue: T | null = null
  for (const ligne of lignes) {
    if (ligne.dateEffet > date && (retenue === null || ligne.dateEffet < retenue.dateEffet)) {
      retenue = ligne
    }
  }
  return retenue
}

/** Statut d'une ligne datée par rapport à une date (affichage des historiques). */
export type StatutLigne = 'a_venir' | 'en_vigueur' | 'passe'

/**
 * Statut d'une ligne parmi les lignes d'une même série (l'historique de grades
 * d'un utilisateur, ou les taux d'un couple grade × nature) :
 * - « à venir » : date d'effet postérieure à la date ;
 * - « en vigueur » : la ligne retenue par ligneEnVigueur ;
 * - « passé » : une ligne antérieure, remplacée depuis.
 *
 * La date d'effet est unique dans une série (D-028 pour les grades, unicité
 * (grade, nature, date d'effet) pour les taux) : elle identifie la ligne.
 */
export function statutLigne(
  lignes: readonly LigneDatee[],
  ligne: LigneDatee,
  date: string,
): StatutLigne {
  if (ligne.dateEffet > date) {
    return 'a_venir'
  }
  const enVigueur = ligneEnVigueur(lignes, date)
  return enVigueur !== null && enVigueur.dateEffet === ligne.dateEffet ? 'en_vigueur' : 'passe'
}

/**
 * Vrai si une date d'effet est « passée » : antérieure ou égale à la date du
 * jour à Paris (spécifications des écrans, règles communes). Une telle date
 * modifie des montants déjà affichés (D-020, D-021) : l'interface demande
 * alors une confirmation.
 *
 * @param maintenant instant de référence (l'horloge est passée en paramètre
 *   pour que la fonction reste pure)
 */
export function estDateEffetPassee(dateEffet: string, maintenant: Date): boolean {
  return dateEffet <= dateParis(maintenant)
}

/**
 * Grade de l'utilisateur à une date : la ligne de l'historique en vigueur à
 * cette date (ligneEnVigueur). Renvoie null si aucun grade n'est en vigueur.
 */
export function gradeEnVigueur(
  historique: readonly HistoriqueGrade[],
  date: string,
): string | null {
  return ligneEnVigueur(historique, date)?.gradeId ?? null
}

/** Taux du référentiel pour un couple (grade, nature), dans l'ordre reçu. */
export function tauxDuCouple<T extends Taux>(
  taux: readonly T[],
  gradeId: string,
  natureId: string,
): T[] {
  return taux.filter((ligne) => ligne.gradeId === gradeId && ligne.natureId === natureId)
}

/**
 * Taux (en centimes par heure) du couple (grade, nature) à une date : la ligne
 * du couple en vigueur à cette date (ligneEnVigueur). Renvoie null si aucun
 * taux n'est en vigueur.
 *
 * Un nouveau taux n'écrase jamais l'ancien : les activités antérieures à sa
 * date d'effet gardent l'ancien taux.
 */
export function tauxEnVigueur(
  taux: readonly Taux[],
  gradeId: string,
  natureId: string,
  date: string,
): number | null {
  return ligneEnVigueur(tauxDuCouple(taux, gradeId, natureId), date)?.centimesParHeure ?? null
}

/**
 * Taux applicable à une activité de nature donnée (3.5) :
 * 1. date de référence = date calendaire du début, en Europe/Paris ;
 * 2. grade de l'utilisateur à cette date ;
 * 3. taux (grade, nature) en vigueur à cette date.
 * Renvoie null s'il manque le grade ou le taux (« taux manquant »).
 */
export function resoudreTaux(
  debut: Date,
  natureId: string,
  historique: readonly HistoriqueGrade[],
  taux: readonly Taux[],
): number | null {
  const date = dateParis(debut)
  const gradeId = gradeEnVigueur(historique, date)
  if (gradeId === null) {
    return null
  }
  return tauxEnVigueur(taux, gradeId, natureId, date)
}
