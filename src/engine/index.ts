// Point d'entrée du moteur de calcul : durées, taux, montants et totaux.
//
// Module pur : aucune dépendance à React ni à Supabase. Les mêmes entrées
// donnent toujours les mêmes résultats, rien n'est lu ni écrit ailleurs.

import { calculerDureesAstreinte, detecterChevauchements, plagesAstreinte } from './astreintes'
import { union } from './intervalles'
import type { Plage } from './intervalles'
import { calculerMontantCentimes } from './remuneration'
import { resoudreTaux } from './taux'
import type {
  ActiviteDetaillee,
  ActiviteEntree,
  HistoriqueGrade,
  Nature,
  ResultatActivite,
  StatutActivite,
  Taux,
  TotalNature,
  Totaux,
} from './types'

export type {
  ActiviteDetaillee,
  ActiviteEntree,
  CompteInterventions,
  DureesAstreinte,
  HistoriqueGrade,
  Nature,
  PlagesActivite,
  ResultatActivite,
  StatutActivite,
  Taux,
  TotalNature,
  Totaux,
} from './types'
export type { Plage } from './intervalles'

// Périodes de Paris et regroupements des restitutions (J3, D-033 à D-035).
export * from './periodes'
export * from './regroupement'

// Résolution des lignes datées (grades, taux), réutilisée par l'affichage des
// historiques et de la grille de taux (src/data/affichage-referentiel.ts).
export {
  dateParis,
  estDateEffetPassee,
  gradeEnVigueur,
  ligneEnVigueur,
  prochaineLigne,
  statutLigne,
  tauxDuCouple,
  tauxEnVigueur,
} from './taux'
export type { LigneDatee, StatutLigne } from './taux'

const MS_PAR_MINUTE = 60_000

/** Tronque un instant à la minute (D-012) et le renvoie en millisecondes UTC. */
function tronquerALaMinute(instant: Date): number {
  return Math.floor(instant.getTime() / MS_PAR_MINUTE) * MS_PAR_MINUTE
}

/**
 * Plage d'une activité, bornes tronquées à la minute.
 * Une entrée impossible lève une erreur explicite : la base l'interdit déjà
 * (contrainte fin > début), il s'agirait donc d'une erreur de programmation.
 */
function plageDe(activite: ActiviteEntree): Plage {
  const debut = tronquerALaMinute(activite.debut)
  const fin = tronquerALaMinute(activite.fin)
  if (Number.isNaN(debut) || Number.isNaN(fin)) {
    throw new Error(`Activité ${activite.id} : date de début ou de fin invalide.`)
  }
  if (fin <= debut) {
    throw new Error(`Activité ${activite.id} : la fin doit être postérieure au début.`)
  }
  return { debut, fin }
}

/**
 * Calcule, pour chaque activité d'un même utilisateur, ses durées, son taux,
 * son montant et son statut. Les résultats sont dans l'ordre des activités
 * reçues.
 *
 * Règles appliquées :
 * - astreinte : durée nette = sa plage privée de l'union de toutes les
 *   activités qui ne sont pas des astreintes (3.4). La déduction ne dépend pas
 *   du taux : une activité en « taux manquant » est quand même déduite (D-011) ;
 * - autre nature : durée déduite = 0, durée nette = durée déclarée (D-011) ;
 * - deux astreintes qui se chevauchent sont en anomalie « chevauchement
 *   d'astreintes » (D-010), qui l'emporte sur « taux manquant » (D-011) ;
 * - une activité en anomalie garde ses durées et son taux s'il existe, mais
 *   son montant n'est pas calculé (D-011).
 *
 * @param activites activités d'un seul utilisateur
 * @param natures natures du référentiel
 * @param historiqueGrades historique des grades de cet utilisateur
 * @param taux taux du référentiel unique
 */
export function calculerActivites(
  activites: readonly ActiviteEntree[],
  natures: readonly Nature[],
  historiqueGrades: readonly HistoriqueGrade[],
  taux: readonly Taux[],
): ResultatActivite[] {
  return calculerActivitesDetaillees(activites, natures, historiqueGrades, taux).map(
    ({ resultat }) => resultat,
  )
}

/**
 * Même calcul que calculerActivites, avec en plus les plages de chaque
 * activité : plage déclarée et, pour une astreinte, ses parties déduites et
 * nettes. Ces plages servent à ventiler les durées d'astreinte sur plusieurs
 * périodes (D-033, src/engine/regroupement.ts). Les résultats sont
 * strictement ceux de calculerActivites.
 */
export function calculerActivitesDetaillees(
  activites: readonly ActiviteEntree[],
  natures: readonly Nature[],
  historiqueGrades: readonly HistoriqueGrade[],
  taux: readonly Taux[],
): ActiviteDetaillee[] {
  const naturesParId = new Map(natures.map((nature) => [nature.id, nature]))

  // Préparation : plage et nature de chaque activité, dans l'ordre reçu.
  const preparees = activites.map((activite) => {
    const nature = naturesParId.get(activite.natureId)
    if (nature === undefined) {
      throw new Error(`Activité ${activite.id} : nature inconnue (${activite.natureId}).`)
    }
    return { activite, nature, plage: plageDe(activite) }
  })

  // B = union des plages de toutes les activités qui ne sont pas des astreintes.
  const autres = union(
    preparees.filter(({ nature }) => !nature.estAstreinte).map(({ plage }) => plage),
  )

  const enChevauchement = detecterChevauchements(
    preparees
      .filter(({ nature }) => nature.estAstreinte)
      .map(({ activite, plage }) => ({ id: activite.id, plage })),
  )

  return preparees.map(({ activite, nature, plage }) => {
    const dureeDeclareeMin = (plage.fin - plage.debut) / MS_PAR_MINUTE
    const durees = nature.estAstreinte
      ? calculerDureesAstreinte(plage, autres)
      : { dureeDeclareeMin, dureeDeduiteMin: 0, dureeNetteMin: dureeDeclareeMin }
    const plages = nature.estAstreinte
      ? plagesAstreinte(plage, autres)
      : { declaree: { ...plage }, deduites: [], nettes: [{ ...plage }] }

    // Le taux est choisi à la date de début de l'activité (3.5).
    const centimesParHeure = resoudreTaux(activite.debut, nature.id, historiqueGrades, taux)

    let statut: StatutActivite = 'ok'
    if (enChevauchement.has(activite.id)) {
      statut = 'chevauchement_astreintes'
    } else if (centimesParHeure === null) {
      statut = 'taux_manquant'
    }

    const montantCentimes =
      statut === 'ok' && centimesParHeure !== null
        ? calculerMontantCentimes(durees.dureeNetteMin, centimesParHeure)
        : null

    return {
      resultat: {
        id: activite.id,
        natureId: nature.id,
        estAstreinte: nature.estAstreinte,
        ...durees,
        centimesParHeure,
        montantCentimes,
        statut,
      },
      plages,
    }
  })
}

/**
 * Totalise des résultats (liste des activités, cahier des charges 3.5).
 * - Montants, nombre « ok » et détail par nature : activités au statut « ok »
 *   seulement (D-011).
 * - Durées d'astreinte : astreintes « ok » et « taux manquant » (D-035) ;
 *   celles en « chevauchement d'astreintes » restent exclues (D-010).
 * - Interventions : toutes, quel que soit leur statut, avec le nombre en
 *   anomalie (D-034).
 * - Anomalies : nombre d'activités par statut.
 *
 * @param natures natures du référentiel (pour reconnaître les interventions)
 */
export function totaliser(
  resultats: readonly ResultatActivite[],
  natures: readonly Nature[],
): Totaux {
  const interventions = new Set(
    natures.filter((nature) => nature.estIntervention).map((nature) => nature.id),
  )
  const totaux: Totaux = {
    montantCentimes: 0,
    astreintes: { dureeDeclareeMin: 0, dureeDeduiteMin: 0, dureeNetteMin: 0 },
    parNature: [],
    nbOk: 0,
    interventions: { nombre: 0, enAnomalie: 0 },
    anomalies: { taux_manquant: 0, chevauchement_astreintes: 0 },
  }
  const parNature = new Map<string, TotalNature>()

  for (const resultat of resultats) {
    // D-034 : toute intervention est comptée, anomalies comprises.
    if (interventions.has(resultat.natureId)) {
      totaux.interventions.nombre += 1
      if (resultat.statut !== 'ok') totaux.interventions.enAnomalie += 1
    }

    // D-035 : un taux manquant n'enlève rien à la durée effectuée d'une astreinte.
    if (resultat.estAstreinte && resultat.statut !== 'chevauchement_astreintes') {
      totaux.astreintes.dureeDeclareeMin += resultat.dureeDeclareeMin
      totaux.astreintes.dureeDeduiteMin += resultat.dureeDeduiteMin
      totaux.astreintes.dureeNetteMin += resultat.dureeNetteMin
    }

    if (resultat.statut !== 'ok') {
      totaux.anomalies[resultat.statut] += 1
      continue
    }

    const montant = resultat.montantCentimes ?? 0
    totaux.nbOk += 1
    totaux.montantCentimes += montant

    let detail = parNature.get(resultat.natureId)
    if (detail === undefined) {
      detail = { natureId: resultat.natureId, nombre: 0, dureeRetenueMin: 0, montantCentimes: 0 }
      parNature.set(resultat.natureId, detail)
      totaux.parNature.push(detail)
    }
    detail.nombre += 1
    // Durée retenue : nette pour une astreinte, déclarée sinon (égales hors astreinte).
    detail.dureeRetenueMin += resultat.dureeNetteMin
    detail.montantCentimes += montant
  }

  return totaux
}
