// Contrôles des formulaires de l'administration (grades, natures, taux).
// Fonctions pures : elles lisent les champs tels que saisis (texte) et
// renvoient soit une saisie valide, prête à envoyer à la base, soit les
// erreurs de chaque champ. Les contrôles de la base (doublons, verrou de
// « est une astreinte »…) restent la référence : ceux-ci évitent seulement un
// aller-retour pour une erreur évidente.

import type {
  CorrectionTaux,
  SaisieGrade,
  SaisieNature,
} from '@/data/requetes-referentiel'

export const MESSAGE_CHAMP_OBLIGATOIRE = 'Ce champ est obligatoire.'
export const MESSAGE_ORDRE_ENTIER = 'L’ordre doit être un nombre entier.'
export const MESSAGE_TAUX_NEGATIF = 'Le taux doit être positif ou nul.'
export const MESSAGE_TAUX_DECIMALES = 'Le taux a au plus 2 décimales.'
export const MESSAGE_TAUX_INVALIDE = 'Le taux doit être un nombre, par exemple 12,50.'
export const MESSAGE_TAUX_TROP_ELEVE = 'Le taux est trop élevé.'
export const MESSAGE_DATE_INVALIDE = 'La date d’effet n’est pas valide.'

// Bornes d'une colonne « int » de PostgreSQL (ordre des grades et des natures).
const ORDRE_MIN = -2_147_483_648
const ORDRE_MAX = 2_147_483_647
// taux_horaire est un numeric(10, 2) : 8 chiffres au plus avant la virgule.
const TAUX_MAX_CENTIMES = 9_999_999_999

/** Résultat de la lecture d'un champ : une valeur, ou un message d'erreur. */
export type Lecture<T> = { valeur: T; erreur: null } | { valeur: null; erreur: string }

function ok<T>(valeur: T): Lecture<T> {
  return { valeur, erreur: null }
}

function echec<T>(erreur: string): Lecture<T> {
  return { valeur: null, erreur }
}

/**
 * Texte obligatoire (libellé, code) : les espaces de début et de fin sont
 * retirés ; un texte vide ou fait d'espaces est refusé.
 */
export function lireTexte(texte: string): Lecture<string> {
  const nettoye = texte.trim()
  return nettoye === '' ? echec(MESSAGE_CHAMP_OBLIGATOIRE) : ok(nettoye)
}

/** Ordre d'affichage : nombre entier obligatoire (« 3 », « -1 » ; pas « 2,5 »). */
export function lireOrdre(texte: string): Lecture<number> {
  const nettoye = texte.trim()
  if (nettoye === '') return echec(MESSAGE_CHAMP_OBLIGATOIRE)
  if (!/^-?\d+$/.test(nettoye)) return echec(MESSAGE_ORDRE_ENTIER)
  const ordre = Number(nettoye)
  if (ordre < ORDRE_MIN || ordre > ORDRE_MAX) return echec(MESSAGE_ORDRE_ENTIER)
  return ok(ordre)
}

/**
 * Taux horaire en euros, positif ou nul, 2 décimales au plus (D-027).
 * La virgule et le point sont acceptés (« 12,50 », « 12.5 »).
 *
 * Le calcul passe par les centimes entiers : « 12,5 » donne exactement 12.5,
 * sans imprécision des nombres à virgule.
 */
export function lireTaux(texte: string): Lecture<number> {
  const nettoye = texte.trim().replace(',', '.')
  if (nettoye === '') return echec(MESSAGE_CHAMP_OBLIGATOIRE)
  if (/^-\s*\d/.test(nettoye)) return echec(MESSAGE_TAUX_NEGATIF)
  const morceaux = /^(\d+)(?:\.(\d*))?$/.exec(nettoye)
  if (morceaux === null) return echec(MESSAGE_TAUX_INVALIDE)
  const [, entiers, decimales = ''] = morceaux
  if (decimales.length > 2) return echec(MESSAGE_TAUX_DECIMALES)
  const centimes = Number(entiers) * 100 + Number(decimales.padEnd(2, '0'))
  if (centimes > TAUX_MAX_CENTIMES) return echec(MESSAGE_TAUX_TROP_ELEVE)
  return ok(centimes / 100)
}

/** Date d'effet AAAA-MM-JJ (valeur d'un champ date natif), existante au calendrier. */
export function lireDateEffet(texte: string): Lecture<string> {
  const nettoye = texte.trim()
  if (nettoye === '') return echec(MESSAGE_CHAMP_OBLIGATOIRE)
  const morceaux = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nettoye)
  if (morceaux === null) return echec(MESSAGE_DATE_INVALIDE)
  const [annee, mois, jour] = morceaux.slice(1).map(Number)
  const date = new Date(Date.UTC(annee, mois - 1, jour))
  // Une date inexistante (31/02) est reportée par le calendrier : refusée.
  if (date.toISOString().slice(0, 10) !== nettoye) return echec(MESSAGE_DATE_INVALIDE)
  return ok(nettoye)
}

/** Résultat de la lecture d'un formulaire : la saisie valide, ou les erreurs par champ. */
export interface LectureFormulaire<S, C extends string> {
  saisie: S | null
  erreurs: Partial<Record<C, string>>
}

/** Réunit les lectures des champs d'un formulaire. */
function reunir<C extends string, S>(
  lectures: { [K in C]: Lecture<unknown> },
  construire: () => S,
): LectureFormulaire<S, C> {
  const erreurs: Partial<Record<C, string>> = {}
  for (const champ of Object.keys(lectures) as C[]) {
    const erreur = lectures[champ].erreur
    if (erreur !== null) erreurs[champ] = erreur
  }
  return { saisie: Object.keys(erreurs).length === 0 ? construire() : null, erreurs }
}

// ---- Grades -----------------------------------------------------------------

export interface ChampsGrade {
  libelle: string
  ordre: string
}

export type ChampGrade = keyof ChampsGrade

export function lireSaisieGrade(champs: ChampsGrade): LectureFormulaire<SaisieGrade, ChampGrade> {
  const libelle = lireTexte(champs.libelle)
  const ordre = lireOrdre(champs.ordre)
  return reunir({ libelle, ordre }, () => ({
    libelle: libelle.valeur as string,
    ordre: ordre.valeur as number,
  }))
}

// ---- Natures ----------------------------------------------------------------

export interface ChampsNature {
  libelle: string
  code: string
  ordre: string
  estAstreinte: boolean
}

export type ChampNature = Exclude<keyof ChampsNature, 'estAstreinte'>

export function lireSaisieNature(
  champs: ChampsNature,
): LectureFormulaire<SaisieNature, ChampNature> {
  const libelle = lireTexte(champs.libelle)
  const code = lireTexte(champs.code)
  const ordre = lireOrdre(champs.ordre)
  return reunir({ libelle, code, ordre }, () => ({
    libelle: libelle.valeur as string,
    code: code.valeur as string,
    ordre: ordre.valeur as number,
    estAstreinte: champs.estAstreinte,
  }))
}

// ---- Taux -------------------------------------------------------------------

export interface ChampsTaux {
  taux: string
  dateEffet: string
}

export type ChampTaux = keyof ChampsTaux

/** Taux et date d'effet saisis (nouveau taux ou correction ; grade et nature sont fixés par l'écran). */
export function lireSaisieTaux(champs: ChampsTaux): LectureFormulaire<CorrectionTaux, ChampTaux> {
  const taux = lireTaux(champs.taux)
  const dateEffet = lireDateEffet(champs.dateEffet)
  return reunir({ taux, dateEffet }, () => ({
    tauxHoraire: taux.valeur as number,
    dateEffet: dateEffet.valeur as string,
  }))
}

/** Taux en euros → texte du champ de saisie (« 12,50 »), pour une correction. */
export function tauxVersChamp(tauxHoraire: number): string {
  return tauxHoraire.toFixed(2).replace('.', ',')
}

// ---- Choix du grade de la grille de taux (spécifications 6.4) -------------------

/**
 * Grade affiché par la grille : celui demandé dans l'adresse s'il existe,
 * sinon le premier de la liste (les grades sont lus actifs d'abord, par ordre
 * hiérarchique). Un identifiant inconnu est ignoré. Null s'il n'y a aucun grade.
 */
export function choisirGrade(
  grades: readonly { id: string }[],
  demande: string | null,
): string | null {
  if (demande !== null && grades.some((grade) => grade.id === demande)) return demande
  return grades[0]?.id ?? null
}
