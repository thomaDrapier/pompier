// Messages de l'administration (spécifications des écrans v1.2, section 6),
// et traduction des erreurs typées de la couche de données en message
// affiché. Fonctions pures.

import {
  ErreurAstreinteEtIntervention,
  ErreurAstreinteVerrouillee,
  ErreurDejaServi,
  ErreurDoublon,
  ErreurTauxNegatif,
} from '@/data/erreurs'
import { formaterJour } from '@/lib/formats'
import { MESSAGES_COMMUNS } from '@/lib/messages'

export const MESSAGES = {
  gradeAjoute: 'Grade ajouté',
  gradeModifie: 'Grade modifié',
  gradeSupprime: 'Grade supprimé',
  gradeDejaServi: 'Ce grade a déjà servi : archivez-le plutôt.',
  natureAjoutee: 'Nature ajoutée',
  natureModifiee: 'Nature modifiée',
  natureSupprimee: 'Nature supprimée',
  natureDejaServi: 'Cette nature a déjà servi : archivez-la plutôt.',
  /** D-022 : explication de la case « Est une astreinte » grisée. */
  astreinteVerrouillee:
    'Cette nature a déjà été utilisée. Pour changer ce comportement, créez une nouvelle nature et archivez celle-ci.',
  /** D-032 : explication de l'exclusion des deux cases, et message du refus de la base. */
  astreinteEtIntervention: 'Une nature ne peut pas être à la fois une astreinte et une intervention.',
  tauxAjoute: 'Taux ajouté',
  tauxCorrige: 'Taux corrigé',
  tauxSupprime: 'Taux supprimé',
  confirmationSuppressionGrade: 'Supprimer ce grade ?',
  confirmationSuppressionNature: 'Supprimer cette nature ?',
  confirmationSuppressionTaux: 'Supprimer ce taux ?',
  detailSuppressionTaux:
    'Les activités concernées reprendront le taux précédent, ou passeront en « taux manquant ».',
  /** D-019 */
  confirmationCorrectionTaux: 'Cette correction modifie les montants des activités concernées.',
  accesReserve: 'Accès réservé à l’administrateur',
  horsLigne: MESSAGES_COMMUNS.horsLigne,
  erreurServeur: MESSAGES_COMMUNS.erreurServeur,
} as const

/** D-020 : confirmation d'une date d'effet passée (nouveau taux ou correction). */
export function messageDateEffetPassee(dateEffet: string): string {
  return `Cette date d’effet est passée : les montants des activités à partir du ${formaterJour(dateEffet)} seront recalculés.`
}

/** Ce qui est supprimé : le message « déjà servi » en dépend. */
export type ObjetSuppression = 'grade' | 'nature'

/**
 * Message à afficher pour une erreur d'écriture. Les erreurs métier gardent
 * le message des spécifications ; toute autre erreur (réseau, serveur) donne
 * un message générique, et la saisie est conservée par l'écran.
 */
export function messageErreur(erreur: unknown, objet?: ObjetSuppression): string {
  if (erreur instanceof ErreurDejaServi) {
    return objet === 'nature' ? MESSAGES.natureDejaServi : MESSAGES.gradeDejaServi
  }
  if (erreur instanceof ErreurAstreinteVerrouillee) return MESSAGES.astreinteVerrouillee
  if (erreur instanceof ErreurAstreinteEtIntervention) return MESSAGES.astreinteEtIntervention
  if (erreur instanceof ErreurDoublon || erreur instanceof ErreurTauxNegatif) {
    return erreur.message
  }
  return MESSAGES.erreurServeur
}
