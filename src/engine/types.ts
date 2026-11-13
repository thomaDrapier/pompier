// Types du moteur de calcul (module pur : aucun import de React, de Supabase
// ni de src/types/database.ts). Le passage des lignes de la base à ces types
// se fera à l'étape 1.2.
//
// Unités : durées en minutes entières, montants en centimes entiers,
// taux en centimes par heure (D-012). Aucun nombre à virgule pour l'argent.

/** Une activité saisie par l'utilisateur (cahier des charges 3.2). */
export interface ActiviteEntree {
  id: string
  /** Identifiant de la nature (référentiel `activity_types`). */
  natureId: string
  /** Instant de début. Tronqué à la minute par le moteur (D-012). */
  debut: Date
  /** Instant de fin, strictement postérieur au début. Tronqué à la minute. */
  fin: Date
}

/** Une nature d'activité du référentiel (cahier des charges 3.3). */
export interface Nature {
  id: string
  /** C'est cet indicateur qui déclenche la règle de déduction (3.4). */
  estAstreinte: boolean
}

/** Une ligne de l'historique des grades de l'utilisateur. */
export interface HistoriqueGrade {
  gradeId: string
  /** Date d'effet au format AAAA-MM-JJ (date calendaire, Europe/Paris). */
  dateEffet: string
}

/** Un taux du référentiel unique, pour un couple (grade, nature). */
export interface Taux {
  gradeId: string
  natureId: string
  /** Taux horaire en centimes entiers (12,34 €/h = 1234). */
  centimesParHeure: number
  /** Date d'effet au format AAAA-MM-JJ (date calendaire, Europe/Paris). */
  dateEffet: string
}

/**
 * Statut d'une activité (D-011). Une activité n'a qu'un seul statut ;
 * « chevauchement d'astreintes » l'emporte sur « taux manquant ».
 */
export type StatutActivite = 'ok' | 'taux_manquant' | 'chevauchement_astreintes'

/** Résultat du calcul pour une activité. */
export interface ResultatActivite {
  id: string
  natureId: string
  estAstreinte: boolean
  /** Durée entre le début et la fin, en minutes. */
  dureeDeclareeMin: number
  /** Durée déduite de l'astreinte (3.4). Toujours 0 hors astreinte. */
  dureeDeduiteMin: number
  /** Durée retenue pour la rémunération : déclarée − déduite. */
  dureeNetteMin: number
  /** Taux appliqué, ou null s'il n'existe pas (« taux manquant »). */
  centimesParHeure: number | null
  /** Montant en centimes ; null pour toute activité en anomalie (D-011). */
  montantCentimes: number | null
  statut: StatutActivite
}

/** Durées d'astreinte, en minutes. */
export interface DureesAstreinte {
  dureeDeclareeMin: number
  dureeDeduiteMin: number
  dureeNetteMin: number
}

/** Détail des totaux pour une nature (activités « ok » uniquement). */
export interface TotalNature {
  natureId: string
  /** Nombre d'activités « ok » de cette nature. */
  nombre: number
  /** Durée retenue : nette pour une astreinte, déclarée sinon. */
  dureeRetenueMin: number
  montantCentimes: number
}

/**
 * Totaux d'un ensemble de résultats (D-011). Durées comme montants ne
 * comptent que les activités au statut « ok ».
 */
export interface Totaux {
  /** Montant total en centimes. */
  montantCentimes: number
  /** Durées des astreintes, totalisées à part des autres natures. */
  astreintes: DureesAstreinte
  /** Détail par nature, dans l'ordre de première apparition. */
  parNature: TotalNature[]
  /** Nombre d'activités au statut « ok ». */
  nbOk: number
  /** Nombre d'activités en anomalie, par statut (exclues des totaux). */
  anomalies: {
    taux_manquant: number
    chevauchement_astreintes: number
  }
}
