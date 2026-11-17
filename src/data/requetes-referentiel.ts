// Lectures et écritures du référentiel (grades, natures, taux), de
// l'historique de grades de l'utilisateur connecté et de son profil.
// Aucune dépendance à React : ces fonctions sont appelées par les hooks.
//
// Les écritures du référentiel sont réservées à l'administrateur : la Row
// Level Security les refuse pour tout autre utilisateur, quel que soit
// l'écran. Les contraintes (doublons, taux négatif, verrou de « est une
// astreinte », suppression d'un élément déjà utilisé) sont contrôlées par la
// base et traduites en erreurs typées (src/data/erreurs.ts).

import type {
  LigneGrade,
  LigneHistoriqueGrade,
  LigneNature,
  LigneTaux,
} from '@/data/conversions'
import { estAdministrateur } from '@/data/conversions'
import { traduireErreur, traduireErreurSuppression } from '@/data/erreurs'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Grades
// ---------------------------------------------------------------------------

/** Champs saisis pour un grade (libellé unique sans distinction de casse, D-024). */
export interface SaisieGrade {
  libelle: string
  ordre: number
}

/** Tous les grades : actifs d'abord, puis archivés, chacun par ordre hiérarchique. */
export async function lireGrades(): Promise<LigneGrade[]> {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .order('actif', { ascending: false })
    .order('ordre')
    .order('libelle')
  if (error) throw traduireErreur(error)
  return data
}

/** Crée un grade, actif dès sa création. */
export async function creerGrade(saisie: SaisieGrade): Promise<LigneGrade> {
  const { data, error } = await supabase
    .from('grades')
    .insert({ libelle: saisie.libelle, ordre: saisie.ordre })
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

/** Modifie le libellé et l'ordre d'un grade (à tout moment). */
export async function modifierGrade(id: string, saisie: SaisieGrade): Promise<LigneGrade> {
  const { data, error } = await supabase
    .from('grades')
    .update({ libelle: saisie.libelle, ordre: saisie.ordre })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

/** Archive (actif = false) ou réactive (actif = true) un grade, sans effet sur le calcul (D-018). */
export async function changerActifGrade(id: string, actif: boolean): Promise<LigneGrade> {
  const { data, error } = await supabase
    .from('grades')
    .update({ actif })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

/** Supprime un grade ; ErreurDejaServi s'il a déjà servi (taux ou historique de grade, D-018). */
export async function supprimerGrade(id: string): Promise<void> {
  const { error } = await supabase.from('grades').delete().eq('id', id)
  if (error) throw traduireErreurSuppression(error)
}

// ---------------------------------------------------------------------------
// Natures d'activité
// ---------------------------------------------------------------------------

/** Champs saisis pour une nature (libellé et code uniques sans distinction de casse). */
export interface SaisieNature {
  libelle: string
  code: string
  ordre: number
  estAstreinte: boolean
}

/** Toutes les natures : actives d'abord, puis archivées, chacune par ordre d'affichage. */
export async function lireNatures(): Promise<LigneNature[]> {
  const { data, error } = await supabase
    .from('activity_types')
    .select('*')
    .order('actif', { ascending: false })
    .order('ordre')
    .order('libelle')
  if (error) throw traduireErreur(error)
  return data
}

/** Crée une nature, active dès sa création. */
export async function creerNature(saisie: SaisieNature): Promise<LigneNature> {
  const { data, error } = await supabase
    .from('activity_types')
    .insert({
      libelle: saisie.libelle,
      code: saisie.code,
      ordre: saisie.ordre,
      est_astreinte: saisie.estAstreinte,
    })
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

/**
 * Modifie une nature. Libellé, code et ordre sont modifiables à tout moment
 * (D-023) ; un changement de « est une astreinte » sur une nature déjà
 * utilisée est refusé par la base : ErreurAstreinteVerrouillee (D-022).
 * Renvoyer la même valeur de « est une astreinte » est toujours accepté.
 */
export async function modifierNature(id: string, saisie: SaisieNature): Promise<LigneNature> {
  const { data, error } = await supabase
    .from('activity_types')
    .update({
      libelle: saisie.libelle,
      code: saisie.code,
      ordre: saisie.ordre,
      est_astreinte: saisie.estAstreinte,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

/** Archive ou réactive une nature, sans effet sur le calcul (D-018). */
export async function changerActifNature(id: string, actif: boolean): Promise<LigneNature> {
  const { data, error } = await supabase
    .from('activity_types')
    .update({ actif })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

/** Supprime une nature ; ErreurDejaServi si elle a déjà servi (taux ou activité, D-018). */
export async function supprimerNature(id: string): Promise<void> {
  const { error } = await supabase.from('activity_types').delete().eq('id', id)
  if (error) throw traduireErreurSuppression(error)
}

/**
 * Vrai si au moins une activité, de n'importe quel utilisateur, utilise la
 * nature (D-022). Réservé à l'administrateur : la base refuse tout autre
 * appelant. Ne renvoie qu'un booléen, jamais une donnée d'activité.
 */
export async function natureUtilisee(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('nature_utilisee', { p_activity_type_id: id })
  if (error) throw traduireErreur(error)
  return data
}

// ---------------------------------------------------------------------------
// Taux du référentiel
// ---------------------------------------------------------------------------

/** Champs saisis pour un nouveau taux (D-019). */
export interface SaisieTaux {
  gradeId: string
  natureId: string
  /** Euros par heure, 2 décimales au plus, positif ou nul (D-027). */
  tauxHoraire: number
  /** AAAA-MM-JJ */
  dateEffet: string
}

/** Correction d'une ligne de taux (erreur de saisie, D-019). */
export interface CorrectionTaux {
  tauxHoraire: number
  dateEffet: string
}

/** Taux d'un grade, toutes natures confondues, par date d'effet croissante. */
export async function lireTauxDuGrade(gradeId: string): Promise<LigneTaux[]> {
  const { data, error } = await supabase
    .from('reference_rates')
    .select('*')
    .eq('grade_id', gradeId)
    .order('date_effet')
  if (error) throw traduireErreur(error)
  return data
}

/** Historique des taux d'un couple grade × nature, du plus récent au plus ancien. */
export async function lireHistoriqueTaux(gradeId: string, natureId: string): Promise<LigneTaux[]> {
  const { data, error } = await supabase
    .from('reference_rates')
    .select('*')
    .eq('grade_id', gradeId)
    .eq('activity_type_id', natureId)
    .order('date_effet', { ascending: false })
  if (error) throw traduireErreur(error)
  return data
}

/** Ajoute un taux (« Nouveau taux ») ; ErreurDoublon ou ErreurTauxNegatif en cas de refus. */
export async function creerTaux(saisie: SaisieTaux): Promise<LigneTaux> {
  const { data, error } = await supabase
    .from('reference_rates')
    .insert({
      grade_id: saisie.gradeId,
      activity_type_id: saisie.natureId,
      taux_horaire: saisie.tauxHoraire,
      date_effet: saisie.dateEffet,
    })
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

/** Corrige le taux et la date d'effet d'une ligne (D-019). */
export async function corrigerTaux(id: string, correction: CorrectionTaux): Promise<LigneTaux> {
  const { data, error } = await supabase
    .from('reference_rates')
    .update({ taux_horaire: correction.tauxHoraire, date_effet: correction.dateEffet })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

/** Supprime une ligne de taux (D-019) : les activités reprennent le taux précédent, ou « taux manquant ». */
export async function supprimerTaux(id: string): Promise<void> {
  const { error } = await supabase.from('reference_rates').delete().eq('id', id)
  if (error) throw traduireErreur(error)
}

// ---------------------------------------------------------------------------
// Historique de grades de l'utilisateur connecté (D-017)
// La lecture est dans src/data/requetes.ts (lireHistoriqueGrades).
// ---------------------------------------------------------------------------

/** Champs saisis pour une ligne de l'historique de grades. */
export interface SaisieHistoriqueGrade {
  gradeId: string
  /** AAAA-MM-JJ ; une seule ligne par date d'effet (D-028). */
  dateEffet: string
}

/** Ajoute une ligne à l'historique de l'utilisateur ; ErreurDoublon si la date d'effet est prise. */
export async function ajouterGradeHistorique(
  userId: string,
  saisie: SaisieHistoriqueGrade,
): Promise<LigneHistoriqueGrade> {
  const { data, error } = await supabase
    .from('user_grade_history')
    .insert({ user_id: userId, grade_id: saisie.gradeId, date_effet: saisie.dateEffet })
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

/** Corrige le grade et la date d'effet d'une ligne de l'historique. */
export async function corrigerGradeHistorique(
  id: string,
  saisie: SaisieHistoriqueGrade,
): Promise<LigneHistoriqueGrade> {
  const { data, error } = await supabase
    .from('user_grade_history')
    .update({ grade_id: saisie.gradeId, date_effet: saisie.dateEffet })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

/** Supprime une ligne de l'historique de grades. */
export async function supprimerGradeHistorique(id: string): Promise<void> {
  const { error } = await supabase.from('user_grade_history').delete().eq('id', id)
  if (error) throw traduireErreur(error)
}

// ---------------------------------------------------------------------------
// Profil de l'utilisateur connecté
// ---------------------------------------------------------------------------

export interface Profil {
  role: string
  actif: boolean
  /**
   * Administrateur : rôle `admin` ET compte actif, même règle que la fonction
   * is_admin() de la base (spécifications des écrans, règles communes).
   * Sert seulement à adapter l'interface : la protection est assurée par la RLS.
   */
  estAdmin: boolean
}

/** Rôle et statut actif de l'utilisateur connecté (chacun ne lit que son profil). */
export async function lireProfil(userId: string): Promise<Profil> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, actif')
    .eq('id', userId)
    .single()
  if (error) throw traduireErreur(error)
  return { role: data.role, actif: data.actif, estAdmin: estAdministrateur(data) }
}
