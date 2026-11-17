import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cles } from '@/data/cles'
import {
  changerActifGrade,
  changerActifNature,
  corrigerTaux,
  creerGrade,
  creerNature,
  creerTaux,
  lireGrades,
  lireHistoriqueTaux,
  lireNatures,
  lireTauxDuGrade,
  modifierGrade,
  modifierNature,
  natureUtilisee,
  supprimerGrade,
  supprimerNature,
  supprimerTaux,
} from '@/data/requetes-referentiel'
import type {
  CorrectionTaux,
  SaisieGrade,
  SaisieNature,
  SaisieTaux,
} from '@/data/requetes-referentiel'
import { invaliderReferentielEtCalculs } from '@/hooks/invalidation'

// Lectures et écritures de l'administration du référentiel : grades, natures
// et grille de taux (spécifications des écrans v1.2, section 6).
//
// Les écritures sont réservées à l'administrateur (RLS). En cas de refus par
// la base, `error` est une erreur typée de src/data/erreurs.ts :
// ErreurDoublon, ErreurDejaServi, ErreurAstreinteVerrouillee ou
// ErreurTauxNegatif, sinon ErreurDonnees.
//
// Après chaque écriture réussie, les lectures du référentiel ET celles des
// calculs de période sont invalidées : les montants affichés peuvent changer.

/** Fabrique une mutation qui invalide le référentiel et les calculs après succès. */
function useEcritureReferentiel<TEntree, TSortie>(ecrire: (entree: TEntree) => Promise<TSortie>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ecrire,
    onSuccess: () => invaliderReferentielEtCalculs(queryClient),
  })
}

// ---- Grades -----------------------------------------------------------------

/** Tous les grades, actifs puis archivés, par ordre hiérarchique. */
export function useGrades() {
  return useQuery({ queryKey: cles.grades, queryFn: lireGrades })
}

export function useCreerGrade() {
  return useEcritureReferentiel((saisie: SaisieGrade) => creerGrade(saisie))
}

export function useModifierGrade() {
  return useEcritureReferentiel(({ id, saisie }: { id: string; saisie: SaisieGrade }) =>
    modifierGrade(id, saisie),
  )
}

/** Archiver (actif = false) ou réactiver (actif = true) un grade. */
export function useChangerActifGrade() {
  return useEcritureReferentiel(({ id, actif }: { id: string; actif: boolean }) =>
    changerActifGrade(id, actif),
  )
}

export function useSupprimerGrade() {
  return useEcritureReferentiel((id: string) => supprimerGrade(id))
}

// ---- Natures ----------------------------------------------------------------

/** Toutes les natures, actives puis archivées, par ordre d'affichage. */
export function useNatures() {
  return useQuery({ queryKey: cles.natures, queryFn: lireNatures })
}

/**
 * La nature a-t-elle déjà servi ? (D-022) Sert à griser la case « Est une
 * astreinte ». Lecture réservée à l'administrateur.
 */
export function useNatureUtilisee(natureId: string | undefined) {
  return useQuery({
    queryKey: cles.natureUtilisee(natureId),
    queryFn: () => natureUtilisee(natureId as string),
    enabled: natureId !== undefined,
  })
}

export function useCreerNature() {
  return useEcritureReferentiel((saisie: SaisieNature) => creerNature(saisie))
}

export function useModifierNature() {
  return useEcritureReferentiel(({ id, saisie }: { id: string; saisie: SaisieNature }) =>
    modifierNature(id, saisie),
  )
}

/** Archiver (actif = false) ou réactiver (actif = true) une nature. */
export function useChangerActifNature() {
  return useEcritureReferentiel(({ id, actif }: { id: string; actif: boolean }) =>
    changerActifNature(id, actif),
  )
}

export function useSupprimerNature() {
  return useEcritureReferentiel((id: string) => supprimerNature(id))
}

// ---- Taux -------------------------------------------------------------------

/** Taux d'un grade, toutes natures confondues (grille de taux). */
export function useTauxDuGrade(gradeId: string | undefined) {
  return useQuery({
    queryKey: cles.tauxDuGrade(gradeId),
    queryFn: () => lireTauxDuGrade(gradeId as string),
    enabled: gradeId !== undefined,
  })
}

/** Historique des taux d'un couple grade × nature, du plus récent au plus ancien. */
export function useHistoriqueTaux(gradeId: string | undefined, natureId: string | undefined) {
  return useQuery({
    queryKey: cles.historiqueTaux(gradeId, natureId),
    queryFn: () => lireHistoriqueTaux(gradeId as string, natureId as string),
    enabled: gradeId !== undefined && natureId !== undefined,
  })
}

/** « Nouveau taux » (D-019). */
export function useCreerTaux() {
  return useEcritureReferentiel((saisie: SaisieTaux) => creerTaux(saisie))
}

/** Correction d'une erreur de saisie (D-019). */
export function useCorrigerTaux() {
  return useEcritureReferentiel(({ id, correction }: { id: string; correction: CorrectionTaux }) =>
    corrigerTaux(id, correction),
  )
}

export function useSupprimerTaux() {
  return useEcritureReferentiel((id: string) => supprimerTaux(id))
}
