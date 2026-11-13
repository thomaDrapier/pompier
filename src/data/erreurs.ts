// Erreurs de la couche de données, typées pour que les écrans puissent les
// reconnaître et afficher le bon message.

/** Code et message de l'erreur levée par le trigger de la base (D-010). */
export const CODE_CHEVAUCHEMENT_ASTREINTES = '23P01'
export const MESSAGE_CHEVAUCHEMENT_ASTREINTES = 'chevauchement_astreintes'

/**
 * Erreur métier : l'astreinte saisie ou modifiée chevauche une autre astreinte
 * de l'utilisateur (D-010). La base a refusé l'enregistrement.
 */
export class ErreurChevauchementAstreintes extends Error {
  constructor() {
    super('Cette astreinte chevauche une autre astreinte.')
    this.name = 'ErreurChevauchementAstreintes'
  }
}

/** Toute autre erreur d'accès aux données (réseau, droits, contrainte…). */
export class ErreurDonnees extends Error {
  /** Code renvoyé par la base ou l'API, s'il existe. */
  readonly code: string | null

  constructor(message: string, code: string | null = null) {
    super(message)
    this.name = 'ErreurDonnees'
    this.code = code
  }
}

/**
 * Traduit une erreur renvoyée par Supabase en erreur de l'application.
 * Le chevauchement d'astreintes est reconnu au code ET au message réunis :
 * le code seul pourrait venir d'une autre contrainte d'exclusion.
 */
export function traduireErreur(erreur: { code?: string; message: string }): Error {
  if (
    erreur.code === CODE_CHEVAUCHEMENT_ASTREINTES &&
    erreur.message === MESSAGE_CHEVAUCHEMENT_ASTREINTES
  ) {
    return new ErreurChevauchementAstreintes()
  }
  return new ErreurDonnees(erreur.message, erreur.code ?? null)
}
