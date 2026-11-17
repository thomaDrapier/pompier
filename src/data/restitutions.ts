// Restitutions (J3) : passage des lignes de la base au moteur, puis
// regroupement par période. Fonctions pures : ni React, ni Supabase.
//
// Une seule lecture couvre toute la plage affichée (une semaine, deux mois,
// douze mois), élargie selon la règle de D-015 (lireActivitesPourCalcul) ;
// le moteur calcule chaque activité une seule fois, puis le module de
// regroupement (src/engine/regroupement.ts) répartit les résultats.

import {
  astreintesDeLaPeriode,
  calculerActivitesDetaillees,
  decalerMois,
  ecart,
  historiqueMensuel,
  joursDeLaSemaine,
  periodeMois,
  periodeSemaine,
  regrouper,
  semainesDuMois,
  totaliserPeriode,
} from '@/engine'
import type {
  ActiviteDetaillee,
  Ecart,
  Nature,
  PartAstreinte,
  PeriodeNommee,
  TotauxPeriode,
} from '@/engine'
import { versActivite, versHistoriqueGrade, versNature, versTaux } from '@/data/conversions'
import type {
  LigneActivite,
  LigneHistoriqueGrade,
  LigneNature,
  LigneTaux,
} from '@/data/conversions'
import type { Periode } from '@/data/periode'

/** Activités calculées par le moteur, avec les natures sous la forme du moteur. */
export interface CalculDetaille {
  activites: ActiviteDetaillee[]
  natures: Nature[]
}

/**
 * Calcule toutes les activités lues (plage élargie comprise) : le moteur a
 * besoin de toutes celles qui chevauchent une astreinte pour la déduction.
 */
export function calculerDetaille(
  lignes: readonly LigneActivite[],
  natures: readonly LigneNature[],
  historiqueGrades: readonly LigneHistoriqueGrade[],
  taux: readonly LigneTaux[],
): CalculDetaille {
  const naturesMoteur = natures.map(versNature)
  return {
    activites: calculerActivitesDetaillees(
      lignes.map(versActivite),
      naturesMoteur,
      historiqueGrades.map(versHistoriqueGrade),
      taux.map(versTaux),
    ),
    natures: naturesMoteur,
  }
}

/** Plage [debut, fin) couvrant une suite de périodes contiguës. */
function plageDe(premiere: PeriodeNommee, derniere: PeriodeNommee): Periode {
  return { debut: new Date(premiere.debut), fin: new Date(derniere.fin) }
}

// ---- Semaine ------------------------------------------------------------------

/** Plage à lire pour une semaine ISO. */
export function plageSemaine(cle: string): Periode {
  const semaine = periodeSemaine(cle)
  return plageDe(semaine, semaine)
}

export interface RestitutionSemaine {
  semaine: TotauxPeriode
  /** Du lundi au dimanche. */
  jours: TotauxPeriode[]
  /** Pour chaque jour (même ordre), ses astreintes et leur part du jour (écran Astreintes). */
  astreintesParJour: PartAstreinte[][]
}

export function restituerSemaine(calcul: CalculDetaille, cle: string): RestitutionSemaine {
  const jours = joursDeLaSemaine(cle)
  return {
    semaine: totaliserPeriode(calcul.activites, calcul.natures, periodeSemaine(cle)),
    jours: regrouper(calcul.activites, calcul.natures, jours),
    astreintesParJour: jours.map((jour) =>
      astreintesDeLaPeriode(calcul.activites, calcul.natures, jour),
    ),
  }
}

// ---- Mois ---------------------------------------------------------------------

/** Plage à lire pour un mois : le mois précédent (pour l'écart) et le mois. */
export function plageMois(cle: string): Periode {
  return plageDe(periodeMois(decalerMois(cle, -1)), periodeMois(cle))
}

export interface RestitutionMois {
  mois: TotauxPeriode
  precedent: TotauxPeriode
  /** Écart du montant total avec le mois précédent. */
  ecart: Ecart
  /** Semaines ISO du mois, limitées au mois. */
  semaines: TotauxPeriode[]
}

export function restituerMois(calcul: CalculDetaille, cle: string): RestitutionMois {
  const mois = totaliserPeriode(calcul.activites, calcul.natures, periodeMois(cle))
  const precedent = totaliserPeriode(
    calcul.activites,
    calcul.natures,
    periodeMois(decalerMois(cle, -1)),
  )
  return {
    mois,
    precedent,
    ecart: ecart(mois.montants.totalCentimes, precedent.montants.totalCentimes),
    semaines: regrouper(calcul.activites, calcul.natures, semainesDuMois(cle)),
  }
}

// ---- Historique ---------------------------------------------------------------

/**
 * Plage à lire pour un historique : du mois qui précède le premier (pour
 * l'écart du premier mois) jusqu'à la fin du dernier.
 */
export function plageHistorique(mois: readonly string[]): Periode {
  return plageDe(periodeMois(decalerMois(mois[0], -1)), periodeMois(mois[mois.length - 1]))
}

/** Un mois de l'historique ; null pour un mois futur (« à vide »). */
export interface MoisHistorique {
  cle: string
  totaux: TotauxPeriode | null
  /** Écart avec le mois précédent ; null pour un mois futur. */
  ecart: Ecart | null
}

export interface RestitutionHistorique {
  mois: MoisHistorique[]
  /** Total des mois affichés (année civile : total annuel). */
  totalCentimes: number
}

/**
 * Historique mensuel (12 mois glissants ou année civile).
 *
 * @param mois clés « AAAA-MM » affichées (moisGlissants ou moisDeLAnnee)
 * @param moisCourant mois en cours à Paris : les mois postérieurs sont à vide
 */
export function restituerHistorique(
  calcul: CalculDetaille,
  mois: readonly string[],
  moisCourant: string,
): RestitutionHistorique {
  const avecPrecedent = [decalerMois(mois[0], -1), ...mois]
  const totaux = historiqueMensuel(calcul.activites, calcul.natures, avecPrecedent, moisCourant)
  const lignes = mois.map((cle, index) => {
    const courant = totaux[index + 1]
    const precedent = totaux[index]
    return {
      cle,
      totaux: courant,
      ecart:
        courant === null
          ? null
          : ecart(courant.montants.totalCentimes, precedent?.montants.totalCentimes ?? 0),
    }
  })
  return {
    mois: lignes,
    totalCentimes: lignes.reduce((total, ligne) => total + (ligne.totaux?.montants.totalCentimes ?? 0), 0),
  }
}
