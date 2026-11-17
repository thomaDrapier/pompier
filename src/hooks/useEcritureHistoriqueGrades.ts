import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ajouterGradeHistorique,
  corrigerGradeHistorique,
  supprimerGradeHistorique,
} from '@/data/requetes-referentiel'
import type { SaisieHistoriqueGrade } from '@/data/requetes-referentiel'
import { useAuth } from '@/features/auth/useAuth'
import { invaliderReferentielEtCalculs } from '@/hooks/invalidation'

// Ajout, correction et suppression d'une ligne de l'historique de grades de
// l'utilisateur connecté (écran Paramètres, D-017). La lecture est faite par
// useHistoriqueGrades.
//
// Une date d'effet déjà prise est refusée par la base : `error` est alors une
// ErreurDoublon de cas « date_effet_grade » (D-028).
//
// Après chaque écriture réussie, l'historique, le référentiel et les calculs
// de période sont invalidés : le grade change le taux des activités (D-021).

export function useAjouterGradeHistorique() {
  const queryClient = useQueryClient()
  const userId = useAuth().session?.user.id
  return useMutation({
    mutationFn: (saisie: SaisieHistoriqueGrade) => {
      if (userId === undefined) {
        return Promise.reject(new Error('Aucun utilisateur connecté.'))
      }
      return ajouterGradeHistorique(userId, saisie)
    },
    onSuccess: () => invaliderReferentielEtCalculs(queryClient),
  })
}

export function useCorrigerGradeHistorique() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, saisie }: { id: string; saisie: SaisieHistoriqueGrade }) =>
      corrigerGradeHistorique(id, saisie),
    onSuccess: () => invaliderReferentielEtCalculs(queryClient),
  })
}

export function useSupprimerGradeHistorique() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => supprimerGradeHistorique(id),
    onSuccess: () => invaliderReferentielEtCalculs(queryClient),
  })
}
