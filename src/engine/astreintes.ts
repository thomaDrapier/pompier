// Règles propres aux astreintes : durée nette (cahier des charges 3.4) et
// détection des astreintes qui se chevauchent (D-010).

import { duree, soustraire } from './intervalles'
import type { Plage } from './intervalles'
import type { DureesAstreinte } from './types'

const MS_PAR_MINUTE = 60_000

/**
 * Durées d'une astreinte.
 *
 * Règle 3.4 : la durée nette d'une astreinte est sa plage privée de l'union
 * de toutes les autres activités (celles qui ne sont pas des astreintes),
 * quelle que soit leur nature. Travailler sur l'union évite de déduire deux
 * fois un même créneau quand deux activités se recouvrent.
 *
 * @param astreinte plage de l'astreinte
 * @param autres plages de toutes les activités qui ne sont pas des astreintes
 */
export function calculerDureesAstreinte(
  astreinte: Plage,
  autres: readonly Plage[],
): DureesAstreinte {
  const declareeMs = duree([astreinte])
  const netteMs = duree(soustraire([astreinte], autres))

  // Les bornes étant des minutes entières (D-012), ces divisions tombent juste.
  const dureeDeclareeMin = declareeMs / MS_PAR_MINUTE
  const dureeNetteMin = netteMs / MS_PAR_MINUTE
  return {
    dureeDeclareeMin,
    dureeDeduiteMin: dureeDeclareeMin - dureeNetteMin,
    dureeNetteMin,
  }
}

/**
 * Renvoie les identifiants des astreintes qui chevauchent au moins une autre
 * astreinte (D-010). Deux astreintes contiguës (fin de l'une = début de
 * l'autre) ne se chevauchent pas.
 *
 * Méthode : on parcourt les astreintes par début croissant en retenant celle
 * qui se termine le plus tard. Si l'astreinte courante commence avant cette
 * fin, les deux se chevauchent. Un seul passage suffit après le tri.
 */
export function detecterChevauchements(
  astreintes: readonly { id: string; plage: Plage }[],
): Set<string> {
  const enChevauchement = new Set<string>()
  const triees = astreintes.toSorted((a, b) => a.plage.debut - b.plage.debut)

  // Astreinte déjà parcourue dont la fin est la plus tardive.
  let plusTardive: { id: string; plage: Plage } | undefined
  for (const astreinte of triees) {
    if (plusTardive !== undefined && astreinte.plage.debut < plusTardive.plage.fin) {
      enChevauchement.add(astreinte.id)
      enChevauchement.add(plusTardive.id)
    }
    if (plusTardive === undefined || astreinte.plage.fin > plusTardive.plage.fin) {
      plusTardive = astreinte
    }
  }
  return enChevauchement
}
