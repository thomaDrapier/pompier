// Point d'entrée du moteur de calcul : durées, taux, montants et totaux.
//
// Module pur : aucune dépendance à React ni à Supabase. Les mêmes entrées
// donnent toujours les mêmes résultats, rien n'est lu ni écrit ailleurs.

import { calculerDureesAstreinte, detecterChevauchements } from './astreintes'
import { union } from './intervalles'
import type { Plage } from './intervalles'
import { calculerMontantCentimes } from './remuneration'
import { resoudreTaux } from './taux'
import type {
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
  ActiviteEntree,
  DureesAstreinte,
  HistoriqueGrade,
  Nature,
  ResultatActivite,
  StatutActivite,
  Taux,
  TotalNature,
  Totaux,
} from './types'

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
      id: activite.id,
      natureId: nature.id,
      estAstreinte: nature.estAstreinte,
      ...durees,
      centimesParHeure,
      montantCentimes,
      statut,
    }
  })
}

/**
 * Totalise des résultats (D-011). Seules les activités au statut « ok »
 * comptent, pour les durées comme pour les montants ; les autres sont
 * dénombrées par statut d'anomalie.
 */
export function totaliser(resultats: readonly ResultatActivite[]): Totaux {
  const totaux: Totaux = {
    montantCentimes: 0,
    astreintes: { dureeDeclareeMin: 0, dureeDeduiteMin: 0, dureeNetteMin: 0 },
    parNature: [],
    nbOk: 0,
    anomalies: { taux_manquant: 0, chevauchement_astreintes: 0 },
  }
  const parNature = new Map<string, TotalNature>()

  for (const resultat of resultats) {
    if (resultat.statut !== 'ok') {
      totaux.anomalies[resultat.statut] += 1
      continue
    }

    const montant = resultat.montantCentimes ?? 0
    totaux.nbOk += 1
    totaux.montantCentimes += montant

    if (resultat.estAstreinte) {
      totaux.astreintes.dureeDeclareeMin += resultat.dureeDeclareeMin
      totaux.astreintes.dureeDeduiteMin += resultat.dureeDeduiteMin
      totaux.astreintes.dureeNetteMin += resultat.dureeNetteMin
    }

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
