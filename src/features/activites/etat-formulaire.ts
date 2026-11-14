// État du formulaire de saisie / modification et ses valeurs par défaut
// (spécifications des écrans, section 3). Fonctions pures.

import type { LigneActivite } from '@/data/conversions'
import type { ChampsSaisie } from '@/features/activites/regles-saisie'
import {
  arrondirAuQuartDHeure,
  champsParis,
  dateFinAutomatique,
  dureeEnMinutes,
  instantParis,
} from '@/lib/temps'

export interface EtatFormulaire extends ChampsSaisie {
  /**
   * Vrai dès que l'utilisateur a modifié lui-même la date de fin : elle ne
   * suit alors plus la date de début.
   */
  dateFinModifiee: boolean
}

export type ChampFormulaire = keyof ChampsSaisie

/**
 * Valeurs par défaut d'une nouvelle activité :
 * - début : maintenant, arrondi au quart d'heure le plus proche ;
 * - fin : date préremplie avec la date de début, heure vide.
 */
export function etatInitialCreation(maintenant: Date, natureId: string): EtatFormulaire {
  const debut = champsParis(arrondirAuQuartDHeure(maintenant))
  return {
    natureId,
    dateDebut: debut.date,
    heureDebut: debut.heure,
    dateFin: debut.date,
    heureFin: '',
    note: '',
    dateFinModifiee: false,
  }
}

/**
 * En modification, les champs reprennent les valeurs de l'activité. Sa date de
 * fin est une valeur enregistrée : elle n'est pas recalculée automatiquement.
 */
export function etatInitialModification(ligne: LigneActivite): EtatFormulaire {
  const debut = champsParis(new Date(ligne.debut))
  const fin = champsParis(new Date(ligne.fin))
  return {
    natureId: ligne.activity_type_id,
    dateDebut: debut.date,
    heureDebut: debut.heure,
    dateFin: fin.date,
    heureFin: fin.heure,
    note: ligne.note ?? '',
    dateFinModifiee: true,
  }
}

/**
 * Applique la saisie d'un champ.
 *
 * Règle « fin au lendemain » : tant que l'utilisateur n'a pas modifié lui-même
 * la date de fin, elle suit la date de début, et passe au lendemain si l'heure
 * de fin est inférieure ou égale à l'heure de début (astreinte de nuit).
 */
export function changerChamp(
  etat: EtatFormulaire,
  champ: ChampFormulaire,
  valeur: string,
): EtatFormulaire {
  const suivant: EtatFormulaire = { ...etat, [champ]: valeur }
  if (champ === 'dateFin') {
    suivant.dateFinModifiee = true
    return suivant
  }
  if (!suivant.dateFinModifiee) {
    suivant.dateFin = dateFinAutomatique(suivant.dateDebut, suivant.heureDebut, suivant.heureFin)
  }
  return suivant
}

/**
 * Durée affichée en direct sous les champs, en minutes, calculée sur les
 * instants réels (juste au changement d'heure). Null tant que début ou fin
 * manque, ou si la fin n'est pas après le début.
 */
export function dureeEnDirect(etat: EtatFormulaire): number | null {
  const debut = instantParis(etat.dateDebut, etat.heureDebut)
  const fin = instantParis(etat.dateFin, etat.heureFin)
  if (debut === null || fin === null) return null
  const minutes = dureeEnMinutes(debut, fin)
  return minutes > 0 ? minutes : null
}
