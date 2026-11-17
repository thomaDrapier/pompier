// Textes des restitutions (spécifications des écrans v1.3), avec les accords
// au singulier et au pluriel (D-016). Fonctions pures.

import { formaterDuree } from '@/lib/formats'

/** « 1 activité », « 3 activités » ; `pluriel` par défaut : singulier + « s ». */
export function compter(nombre: number, singulier: string, pluriel = `${singulier}s`): string {
  return `${nombre} ${nombre === 1 ? singulier : pluriel}`
}

/** Règle « Anomalies » (D-034) : « dont 1 en anomalie », « dont 2 en anomalie ». */
export function texteDontAnomalies(nombre: number): string {
  return `dont ${nombre} en anomalie`
}

/**
 * Bandeau d'anomalie : « 1 activité non comptée : taux manquant (1) »,
 * « 3 activités non comptées : taux manquant (2), chevauchement d’astreintes (1) ».
 * Seules les anomalies présentes sont citées ; null s'il n'y en a aucune.
 */
export function texteActivitesNonComptees(anomalies: {
  taux_manquant: number
  chevauchement_astreintes: number
}): string | null {
  const { taux_manquant: tauxManquant, chevauchement_astreintes: chevauchement } = anomalies
  const total = tauxManquant + chevauchement
  if (total === 0) return null
  const details = [
    tauxManquant > 0 ? `taux manquant (${tauxManquant})` : null,
    chevauchement > 0 ? `chevauchement d’astreintes (${chevauchement})` : null,
  ].filter((detail) => detail !== null)
  const debut = total === 1 ? '1 activité non comptée' : `${total} activités non comptées`
  return `${debut} : ${details.join(', ')}`
}

/**
 * Accueil (spécifications 7) : « 1 astreinte à cheval sur deux mois : heures
 * réparties, montant compté sur le mois de début. » ; null si aucune.
 */
export function texteAstreintesAChevalMois(nombre: number): string | null {
  if (nombre === 0) return null
  return `${compter(nombre, 'astreinte')} à cheval sur deux mois : heures réparties, montant compté sur le mois de début.`
}

/** Catégories de rémunération (spécifications, règles communes), dans l'ordre d'affichage. */
export const LIBELLES_CATEGORIES = {
  astreinte: 'Astreintes',
  intervention: 'Interventions',
  autre: 'Autres activités',
} as const

/** Durées d'astreinte « déclarée · déduite · nette » : « 14 h 00 · 1 h 30 · 12 h 30 ». */
export function texteDureesAstreinte(durees: {
  dureeDeclareeMin: number
  dureeDeduiteMin: number
  dureeNetteMin: number
}): string {
  return [durees.dureeDeclareeMin, durees.dureeDeduiteMin, durees.dureeNetteMin]
    .map(formaterDuree)
    .join(' · ')
}
