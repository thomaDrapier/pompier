// Erreurs de la couche de données, typées pour que les écrans puissent les
// reconnaître et afficher le bon message.
//
// Une erreur de la base est reconnue à son code SQLSTATE ET au nom de la
// contrainte (ou au message fixe d'un trigger), jamais au seul texte : le
// texte d'une erreur PostgreSQL peut changer, pas le nom d'une contrainte
// (noms explicites, migration …_referentiel_j2.sql).

/** Codes SQLSTATE utilisés par la base. */
export const SQLSTATE = {
  /** Violation d'unicité (contrainte ou index unique). */
  unicite: '23505',
  /** Violation de clé étrangère. */
  cleEtrangere: '23503',
  /** Violation d'une contrainte check. */
  check: '23514',
  /** Violation d'exclusion : chevauchement d'astreintes (D-010). */
  exclusion: '23P01',
  /** Code propre à l'application : verrou de « est une astreinte » (D-022). */
  astreinteVerrouillee: 'SPV01',
} as const

/** Code et message de l'erreur levée par le trigger de la base (D-010). */
export const CODE_CHEVAUCHEMENT_ASTREINTES = SQLSTATE.exclusion
export const MESSAGE_CHEVAUCHEMENT_ASTREINTES = 'chevauchement_astreintes'

/** Code et message de l'erreur levée par le verrou de « est une astreinte » (D-022). */
export const CODE_ASTREINTE_VERROUILLEE = SQLSTATE.astreinteVerrouillee
export const MESSAGE_ASTREINTE_VERROUILLEE = 'est_astreinte_verrouille'

/** Cas de doublon refusés par la base, avec le nom de la contrainte correspondante. */
export const CONTRAINTES_UNICITE = {
  /** D-024 */
  libelle_grade: 'grades_libelle_unique_ci',
  /** D-026 */
  libelle_nature: 'activity_types_libelle_unique_ci',
  /** D-023 */
  code_nature: 'activity_types_code_unique_ci',
  /** Un seul taux par (grade, nature, date d'effet). */
  taux: 'reference_rates_grade_nature_date_unique',
  /** D-028 */
  date_effet_grade: 'user_grade_history_user_date_unique',
} as const

export type CasDoublon = keyof typeof CONTRAINTES_UNICITE

/** Contrainte check du taux positif ou nul (D-027). */
export const CONTRAINTE_TAUX_POSITIF = 'reference_rates_taux_positif_ou_nul'

/** Contrainte check : une nature n'est pas à la fois astreinte et intervention (D-032). */
export const CONTRAINTE_ASTREINTE_OU_INTERVENTION = 'activity_types_astreinte_ou_intervention'

/**
 * Clés étrangères qui empêchent de supprimer un grade ou une nature déjà
 * utilisé (D-018) : par un taux, un historique de grade ou une activité.
 */
export const CLES_ETRANGERES_REFERENTIEL = [
  'reference_rates_grade_id_fkey',
  'user_grade_history_grade_id_fkey',
  'reference_rates_activity_type_id_fkey',
  'activities_activity_type_id_fkey',
] as const

/** Messages des doublons (spécifications des écrans v1.2). */
const MESSAGES_DOUBLON: Record<CasDoublon, string> = {
  libelle_grade: 'Un grade porte déjà ce libellé.',
  libelle_nature: 'Une nature porte déjà ce libellé.',
  code_nature: 'Une nature porte déjà ce code.',
  taux: 'Un taux existe déjà pour ce grade, cette nature et cette date d’effet.',
  date_effet_grade: 'Un grade est déjà enregistré à cette date.',
}

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

/** Erreur métier : la base a refusé un doublon (D-023, D-024, D-026, D-028, taux). */
export class ErreurDoublon extends Error {
  /** Ce qui est en double ; le message correspondant est dans `message`. */
  readonly cas: CasDoublon

  constructor(cas: CasDoublon) {
    super(MESSAGES_DOUBLON[cas])
    this.name = 'ErreurDoublon'
    this.cas = cas
  }
}

/**
 * Erreur métier : suppression refusée, car le grade ou la nature a déjà servi
 * (taux, historique de grade ou activité, D-018). Il faut l'archiver.
 * Le message précis (« Ce grade a déjà servi… ») est choisi par l'écran.
 */
export class ErreurDejaServi extends Error {
  constructor() {
    super('Cet élément a déjà servi : archivez-le plutôt.')
    this.name = 'ErreurDejaServi'
  }
}

/**
 * Erreur métier : l'indicateur « est une astreinte » ne peut plus changer,
 * car une activité utilise la nature (D-022).
 */
export class ErreurAstreinteVerrouillee extends Error {
  constructor() {
    super(
      'Cette nature a déjà été utilisée. Pour changer ce comportement, créez une nouvelle nature et archivez celle-ci.',
    )
    this.name = 'ErreurAstreinteVerrouillee'
  }
}

/** Erreur métier : un taux horaire négatif a été refusé (D-027). */
export class ErreurTauxNegatif extends Error {
  constructor() {
    super('Le taux doit être positif ou nul.')
    this.name = 'ErreurTauxNegatif'
  }
}

/**
 * Erreur métier : une nature ne peut pas être à la fois une astreinte et une
 * intervention (D-032). Message de la spécification des écrans, § 6.3.
 */
export class ErreurAstreinteEtIntervention extends Error {
  constructor() {
    super('Une nature ne peut pas être à la fois une astreinte et une intervention.')
    this.name = 'ErreurAstreinteEtIntervention'
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

/** Erreur telle que renvoyée par Supabase (PostgREST). */
export interface ErreurSupabase {
  code?: string
  message: string
}

/**
 * Nom de la contrainte en cause, lu dans le message de PostgreSQL
 * (… violates unique constraint "nom" …). Null s'il n'y figure pas.
 */
export function nomContrainte(erreur: ErreurSupabase): string | null {
  return /constraint "([^"]+)"/.exec(erreur.message)?.[1] ?? null
}

/** Cas de doublon correspondant à une contrainte d'unicité, ou null. */
function casDoublon(contrainte: string | null): CasDoublon | null {
  for (const [cas, nom] of Object.entries(CONTRAINTES_UNICITE)) {
    if (nom === contrainte) return cas as CasDoublon
  }
  return null
}

/**
 * Traduit une erreur renvoyée par Supabase en erreur de l'application.
 * Le chevauchement d'astreintes et le verrou de « est une astreinte » sont
 * reconnus au code ET au message réunis : le code seul pourrait venir d'une
 * autre contrainte. Les doublons, le taux négatif et l'exclusion astreinte /
 * intervention (D-032) sont reconnus au code ET au nom de la contrainte.
 */
export function traduireErreur(erreur: ErreurSupabase): Error {
  const contrainte = nomContrainte(erreur)

  if (
    erreur.code === CODE_CHEVAUCHEMENT_ASTREINTES &&
    erreur.message === MESSAGE_CHEVAUCHEMENT_ASTREINTES
  ) {
    return new ErreurChevauchementAstreintes()
  }
  if (
    erreur.code === CODE_ASTREINTE_VERROUILLEE &&
    erreur.message === MESSAGE_ASTREINTE_VERROUILLEE
  ) {
    return new ErreurAstreinteVerrouillee()
  }
  if (erreur.code === SQLSTATE.unicite) {
    const cas = casDoublon(contrainte)
    if (cas !== null) return new ErreurDoublon(cas)
  }
  if (erreur.code === SQLSTATE.check && contrainte === CONTRAINTE_TAUX_POSITIF) {
    return new ErreurTauxNegatif()
  }
  if (erreur.code === SQLSTATE.check && contrainte === CONTRAINTE_ASTREINTE_OU_INTERVENTION) {
    return new ErreurAstreinteEtIntervention()
  }
  return new ErreurDonnees(erreur.message, erreur.code ?? null)
}

/**
 * Traduit l'erreur d'une SUPPRESSION de grade ou de nature : une violation de
 * clé étrangère signifie que l'élément a déjà servi (D-018). À la création ou
 * à la modification, la même violation aurait un autre sens (référence à un
 * élément inexistant) : d'où cette fonction distincte de traduireErreur.
 */
export function traduireErreurSuppression(erreur: ErreurSupabase): Error {
  const contrainte = nomContrainte(erreur)
  if (
    erreur.code === SQLSTATE.cleEtrangere &&
    (CLES_ETRANGERES_REFERENTIEL as readonly string[]).includes(contrainte ?? '')
  ) {
    return new ErreurDejaServi()
  }
  return traduireErreur(erreur)
}
