// Clés des requêtes TanStack Query, réunies ici pour que lectures et
// invalidations utilisent exactement les mêmes.

import type { Periode } from '@/data/periode'

export const cles = {
  /**
   * Référentiel complet (natures, grades, taux) utilisé par les calculs de
   * période. C'est aussi le préfixe de toutes les lectures du référentiel
   * ci-dessous : invalider `cles.referentiel` les invalide toutes.
   */
  referentiel: ['referentiel'] as const,
  /** Tous les grades, actifs puis archivés (administration). */
  grades: ['referentiel', 'grades'] as const,
  /** Toutes les natures, actives puis archivées (administration). */
  natures: ['referentiel', 'natures'] as const,
  /** Vrai si une activité, de n'importe quel utilisateur, utilise la nature (D-022). */
  natureUtilisee: (natureId: string | undefined) =>
    ['referentiel', 'nature-utilisee', natureId] as const,
  /** Taux d'un grade, tous couples confondus (grille de taux). */
  tauxDuGrade: (gradeId: string | undefined) => ['referentiel', 'taux', gradeId] as const,
  /** Historique des taux d'un couple grade × nature. */
  historiqueTaux: (gradeId: string | undefined, natureId: string | undefined) =>
    ['referentiel', 'taux', gradeId, natureId] as const,

  /** Préfixe commun aux historiques de grades (pour les invalider d'un coup). */
  historiquesGrades: ['historique-grades'] as const,
  historiqueGrades: (userId: string | undefined) => ['historique-grades', userId] as const,
  /** Profil de l'utilisateur connecté (rôle et statut actif). */
  profil: (userId: string | undefined) => ['profil', userId] as const,

  /** Préfixe commun à toutes les lectures d'activités (pour les invalider d'un coup). */
  activites: ['activites'] as const,
  activitesPeriode: (userId: string | undefined, periode: Periode) =>
    ['activites', userId, periode.debut.toISOString(), periode.fin.toISOString()] as const,
  activite: (id: string | undefined) => ['activites', 'detail', id] as const,
  derniereActivite: (userId: string | undefined) => ['activites', 'derniere', userId] as const,
}
