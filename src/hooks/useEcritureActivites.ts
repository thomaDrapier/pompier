import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cles } from '@/data/cles'
import { creerActivite, modifierActivite, supprimerActivite } from '@/data/requetes'
import type { SaisieActivite } from '@/data/requetes'

// Création, modification et suppression d'une activité.
//
// Après chaque écriture réussie, toutes les lectures d'activités sont marquées
// périmées : elles sont relancées et les calculs se refont (cahier des charges
// 3.2 : « tous les calculs sont alors mis à jour »).
//
// En cas de refus par la base pour chevauchement d'astreintes (D-010),
// `error` est une ErreurChevauchementAstreintes (src/data/erreurs.ts).

export function useCreerActivite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (saisie: SaisieActivite) => creerActivite(saisie),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cles.activites }),
  })
}

export function useModifierActivite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, saisie }: { id: string; saisie: SaisieActivite }) =>
      modifierActivite(id, saisie),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cles.activites }),
  })
}

export function useSupprimerActivite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => supprimerActivite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cles.activites }),
  })
}
