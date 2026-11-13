// Lectures et écritures dans Supabase. Aucune dépendance à React : ces
// fonctions sont appelées par les hooks de src/hooks/.
//
// La clé publique seule est utilisée (src/lib/supabase.ts) : la Row Level
// Security limite chaque utilisateur à ses propres lignes.

import type {
  LigneActivite,
  LigneGrade,
  LigneHistoriqueGrade,
  LigneNature,
  LigneTaux,
} from '@/data/conversions'
import { traduireErreur } from '@/data/erreurs'
import { lireActivitesPourCalcul } from '@/data/periode'
import type { Periode, SourceActivites } from '@/data/periode'
import { supabase } from '@/lib/supabase'

/** Référentiel unique et commun (lecture seule pour l'utilisateur). */
export interface Referentiel {
  natures: LigneNature[]
  grades: LigneGrade[]
  taux: LigneTaux[]
}

/** Champs saisis pour créer ou modifier une activité (cahier des charges 3.2). */
export interface SaisieActivite {
  natureId: string
  debut: Date
  fin: Date
  note?: string | null
}

export async function lireReferentiel(): Promise<Referentiel> {
  const [natures, grades, taux] = await Promise.all([
    supabase.from('activity_types').select('*').order('ordre'),
    supabase.from('grades').select('*').order('ordre'),
    supabase.from('reference_rates').select('*').order('date_effet'),
  ])
  if (natures.error) throw traduireErreur(natures.error)
  if (grades.error) throw traduireErreur(grades.error)
  if (taux.error) throw traduireErreur(taux.error)
  return { natures: natures.data, grades: grades.data, taux: taux.data }
}

export async function lireHistoriqueGrades(userId: string): Promise<LigneHistoriqueGrade[]> {
  const { data, error } = await supabase
    .from('user_grade_history')
    .select('*')
    .eq('user_id', userId)
    .order('date_effet')
  if (error) throw traduireErreur(error)
  return data
}

/**
 * Source Supabase des activités d'un utilisateur, pour le calcul d'une période.
 * @param idsNaturesAstreinte identifiants des natures dont `est_astreinte` est vrai
 */
export function sourceSupabase(
  userId: string,
  idsNaturesAstreinte: readonly string[],
): SourceActivites {
  return {
    async astreintesCommencantDans(periode) {
      if (idsNaturesAstreinte.length === 0) return []
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .in('activity_type_id', [...idsNaturesAstreinte])
        .gte('debut', periode.debut.toISOString())
        .lt('debut', periode.fin.toISOString())
      if (error) throw traduireErreur(error)
      return data
    },
    async activitesChevauchant(plage) {
      // Chevauchement en plages semi-ouvertes : début < fin de la plage
      // ET fin > début de la plage.
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .lt('debut', plage.fin.toISOString())
        .gt('fin', plage.debut.toISOString())
        .order('debut')
      if (error) throw traduireErreur(error)
      return data
    },
  }
}

/**
 * Activités nécessaires au calcul d'une période, y compris celles hors période
 * qui chevauchent une astreinte de la période (voir src/data/periode.ts).
 */
export function lireActivitesPourPeriode(
  userId: string,
  periode: Periode,
  idsNaturesAstreinte: readonly string[],
): Promise<LigneActivite[]> {
  return lireActivitesPourCalcul(sourceSupabase(userId, idsNaturesAstreinte), periode)
}

/** Crée une activité pour l'utilisateur connecté (user_id rempli par la base). */
export async function creerActivite(saisie: SaisieActivite): Promise<LigneActivite> {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      activity_type_id: saisie.natureId,
      debut: saisie.debut.toISOString(),
      fin: saisie.fin.toISOString(),
      note: saisie.note ?? null,
    })
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

export async function modifierActivite(id: string, saisie: SaisieActivite): Promise<LigneActivite> {
  const { data, error } = await supabase
    .from('activities')
    .update({
      activity_type_id: saisie.natureId,
      debut: saisie.debut.toISOString(),
      fin: saisie.fin.toISOString(),
      note: saisie.note ?? null,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw traduireErreur(error)
  return data
}

export async function supprimerActivite(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id)
  if (error) throw traduireErreur(error)
}
