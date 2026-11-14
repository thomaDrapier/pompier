// Clés des requêtes TanStack Query, réunies ici pour que lectures et
// invalidations utilisent exactement les mêmes.

import type { Periode } from '@/data/periode'

export const cles = {
  referentiel: ['referentiel'] as const,
  historiqueGrades: (userId: string | undefined) => ['historique-grades', userId] as const,
  /** Préfixe commun à toutes les lectures d'activités (pour les invalider d'un coup). */
  activites: ['activites'] as const,
  activitesPeriode: (userId: string | undefined, periode: Periode) =>
    ['activites', userId, periode.debut.toISOString(), periode.fin.toISOString()] as const,
  activite: (id: string | undefined) => ['activites', 'detail', id] as const,
  derniereActivite: (userId: string | undefined) => ['activites', 'derniere', userId] as const,
}
