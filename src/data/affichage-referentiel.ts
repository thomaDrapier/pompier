// Fonctions pures pour l'affichage des taux et de l'historique de grades
// (spécifications des écrans v1.2, sections 5 et 6.4).
//
// Aucune règle n'est réécrite ici : le choix de la ligne en vigueur, de la
// prochaine ligne et du statut vient du moteur de calcul (src/engine/taux.ts),
// le même qui choisit le taux des activités. Ce fichier ne fait que passer
// des lignes de la base aux types du moteur, et retour.

import { ligneEnVigueur, prochaineLigne, statutLigne } from '@/engine'
import type { StatutLigne } from '@/engine'
import type { LigneHistoriqueGrade, LigneTaux } from '@/data/conversions'
import { formaterJour, formaterTaux } from '@/lib/formats'

// Date du jour à Paris (dateParis) et date d'effet « passée »
// (estDateEffetPassee) : fonctions du moteur, réexportées pour les écrans.
export { dateParis, estDateEffetPassee } from '@/engine'
export type { StatutLigne } from '@/engine'

/** Une ligne de la base, accompagnée de sa date d'effet au format du moteur. */
interface Datee<T> {
  dateEffet: string
  ligne: T
}

function dater<T extends { date_effet: string }>(lignes: readonly T[]): Datee<T>[] {
  return lignes.map((ligne) => ({ dateEffet: ligne.date_effet, ligne }))
}

/** Taux en vigueur et prochain taux d'un couple grade × nature. */
export interface TauxCouple {
  /** Taux en vigueur à la date ; null s'il n'y en a aucun. */
  enVigueur: LigneTaux | null
  /** Prochain taux (date d'effet future) ; null s'il n'y en a aucun. */
  prochain: LigneTaux | null
}

/**
 * Taux en vigueur à une date et prochain taux d'un couple grade × nature
 * (« 12,00 €/h depuis le 01/01/2026 », « 12,50 €/h à partir du 01/07/2027 »,
 * ou « Aucun taux » si les deux sont null).
 *
 * @param taux lignes du référentiel (tous couples possibles)
 * @param date AAAA-MM-JJ, en général la date du jour à Paris
 */
export function tauxCouple(
  taux: readonly LigneTaux[],
  gradeId: string,
  natureId: string,
  date: string,
): TauxCouple {
  const lignes = dater(
    taux.filter((ligne) => ligne.grade_id === gradeId && ligne.activity_type_id === natureId),
  )
  return {
    enVigueur: ligneEnVigueur(lignes, date)?.ligne ?? null,
    prochain: prochaineLigne(lignes, date)?.ligne ?? null,
  }
}

/** Une ligne d'historique (taux d'un couple ou grade de l'utilisateur) et son statut. */
export interface LigneAvecStatut<T> {
  ligne: T
  /**
   * « à venir », « en vigueur » ou « passé ». Pour l'historique de grades,
   * l'écran affiche « Actuel » pour « en vigueur » (spécifications 5.1).
   */
  statut: StatutLigne
}

/**
 * Lignes d'une même série (taux d'un couple, ou historique de grades d'un
 * utilisateur), de la plus récente à la plus ancienne, avec leur statut à la
 * date donnée.
 */
export function avecStatut<T extends { date_effet: string }>(
  lignes: readonly T[],
  date: string,
): LigneAvecStatut<T>[] {
  const datees = dater(lignes)
  return datees
    .toSorted((a, b) => (a.dateEffet < b.dateEffet ? 1 : a.dateEffet > b.dateEffet ? -1 : 0))
    .map((datee) => ({ ligne: datee.ligne, statut: statutLigne(datees, datee, date) }))
}

/**
 * Ligne de l'historique de grades en vigueur à une date : le grade actuel si
 * la date est celle du jour. Null si aucun grade n'est renseigné à cette date
 * (les activités sont alors en « taux manquant »).
 */
export function gradeALaDate(
  historique: readonly LigneHistoriqueGrade[],
  date: string,
): LigneHistoriqueGrade | null {
  return ligneEnVigueur(dater(historique), date)?.ligne ?? null
}

/** « 12,00 €/h depuis le 01/01/2026 » : taux en vigueur (spécifications 5.2 et 6.4). */
export function texteTauxEnVigueur(ligne: LigneTaux): string {
  return `${formaterTaux(ligne.taux_horaire)} depuis le ${formaterJour(ligne.date_effet)}`
}

/** « 12,50 €/h à partir du 01/07/2027 » : prochain taux (spécifications 5.2 et 6.4). */
export function texteProchainTaux(ligne: LigneTaux): string {
  return `${formaterTaux(ligne.taux_horaire)} à partir du ${formaterJour(ligne.date_effet)}`
}
