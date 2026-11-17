// Règles de l'écran Paramètres (spécifications des écrans v1.2, section 5) :
// textes, contrôle du formulaire de grade et confirmation des dates d'effet
// passées. Fonctions pures.

import { estDateEffetPassee } from '@/data/affichage-referentiel'
import type { LigneGrade } from '@/data/conversions'
import { ErreurDoublon } from '@/data/erreurs'
import type { SaisieHistoriqueGrade } from '@/data/requetes-referentiel'
import { MESSAGE_CHAMP_OBLIGATOIRE, lireDateEffet } from '@/features/admin/regles-admin'
import { formaterJour } from '@/lib/formats'
import { MESSAGES_COMMUNS } from '@/lib/messages'

export const MESSAGES_PARAMETRES = {
  aucunGrade: 'Aucun grade renseigné : vos activités sont en « taux manquant ». Ajoutez votre grade.',
  renseignezGrade: 'Renseignez votre grade pour voir vos taux.',
  gradeAjoute: 'Grade ajouté',
  gradeModifie: 'Grade modifié',
  gradeSupprime: 'Grade supprimé',
  confirmationSuppression: 'Supprimer cette ligne ?',
  detailSuppression: 'Les montants de vos activités concernées seront recalculés.',
  lienEnvoye: 'Un lien de réinitialisation vous a été envoyé par e-mail.',
  lienHorsLigne: 'Pas de connexion réseau : le lien ne peut pas être envoyé.',
  lienEchec: 'L’envoi du lien a échoué. Vérifiez votre connexion et réessayez.',
} as const

/** D-021 : confirmation d'une date d'effet passée dans l'historique de grades. */
export function messageRecalcul(date: string): string {
  return `Les montants de vos activités à partir du ${formaterJour(date)} seront recalculés.`
}

/**
 * Date à citer dans la confirmation de D-021, ou null s'il n'en faut pas.
 *
 * - Ajout (`ancienne` null) : confirmation si la date d'effet est passée.
 * - Correction : confirmation si l'ancienne OU la nouvelle date d'effet est
 *   passée (spécifications 5.1). La date citée est la plus ancienne des dates
 *   passées : c'est à partir d'elle que les montants changent. (Une date
 *   future ne modifie aucun montant déjà affiché.)
 *
 * @param maintenant instant de référence (l'horloge est passée en paramètre)
 */
export function dateAConfirmer(
  ancienne: string | null,
  nouvelle: string,
  maintenant: Date,
): string | null {
  const passees = [ancienne, nouvelle].filter(
    (date): date is string => date !== null && estDateEffetPassee(date, maintenant),
  )
  if (passees.length === 0) return null
  return passees.reduce((plusAncienne, date) => (date < plusAncienne ? date : plusAncienne))
}

export interface ChampsHistorique {
  gradeId: string
  dateEffet: string
}

export type ChampHistorique = keyof ChampsHistorique

/** Grade et date d'effet obligatoires ; date existante au calendrier. */
export function lireSaisieHistorique(champs: ChampsHistorique): {
  saisie: SaisieHistoriqueGrade | null
  erreurs: Partial<Record<ChampHistorique, string>>
} {
  const erreurs: Partial<Record<ChampHistorique, string>> = {}
  if (champs.gradeId === '') erreurs.gradeId = MESSAGE_CHAMP_OBLIGATOIRE
  const date = lireDateEffet(champs.dateEffet)
  if (date.erreur !== null) erreurs.dateEffet = date.erreur
  if (Object.keys(erreurs).length > 0) return { saisie: null, erreurs }
  return { saisie: { gradeId: champs.gradeId, dateEffet: date.valeur as string }, erreurs }
}

/**
 * Grades proposés dans la liste : les grades actifs (D-018), plus, en
 * correction, le grade déjà présent sur la ligne s'il a été archivé (il peut
 * être conservé). L'ordre de la liste reçue est gardé.
 */
export function gradesProposes(
  grades: readonly LigneGrade[],
  gradeDeLaLigne: string | null,
): LigneGrade[] {
  return grades.filter((grade) => grade.actif || grade.id === gradeDeLaLigne)
}

/** Libellé d'un grade dans une liste ; un grade archivé est signalé. */
export function libelleGrade(grade: LigneGrade): string {
  return grade.actif ? grade.libelle : `${grade.libelle} (Archivé)`
}

/**
 * Message d'une erreur d'écriture de l'historique : doublon de date d'effet
 * (D-028, message de la spécification), sinon message générique ; la saisie
 * est conservée par l'écran.
 */
export function messageErreurHistorique(erreur: unknown): string {
  if (erreur instanceof ErreurDoublon) return erreur.message
  return MESSAGES_COMMUNS.erreurServeur
}
