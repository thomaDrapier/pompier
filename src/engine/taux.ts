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

/**
 * Grade de l'utilisateur à une date : la ligne de l'historique dont la date
 * d'effet est la plus récente parmi celles antérieures ou égales à la date.
 * Renvoie null si aucun grade n'est en vigueur à cette date.
 *
 * Les dates AAAA-MM-JJ se comparent directement comme du texte.
 */
export function gradeEnVigueur(
  historique: readonly HistoriqueGrade[],
  date: string,
): string | null {
  let retenu: HistoriqueGrade | null = null
  for (const ligne of historique) {
    if (ligne.dateEffet <= date && (retenu === null || ligne.dateEffet >= retenu.dateEffet)) {
      retenu = ligne
    }
  }
  return retenu === null ? null : retenu.gradeId
}

/**
 * Taux (en centimes par heure) du couple (grade, nature) à une date : la ligne
 * dont la date d'effet est la plus récente parmi celles antérieures ou égales
 * à la date. Renvoie null si aucun taux n'est en vigueur.
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
  let retenu: Taux | null = null
  for (const ligne of taux) {
    if (
      ligne.gradeId === gradeId &&
      ligne.natureId === natureId &&
      ligne.dateEffet <= date &&
      (retenu === null || ligne.dateEffet >= retenu.dateEffet)
    ) {
      retenu = ligne
    }
  }
  return retenu === null ? null : retenu.centimesParHeure
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
