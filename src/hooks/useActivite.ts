import { useQuery } from '@tanstack/react-query'
import { cles } from '@/data/cles'
import { lireActivite, lireDerniereActivite } from '@/data/requetes'
import { useAuth } from '@/features/auth/useAuth'

// Une activité par son identifiant (écran de modification).
// `data` vaut null si elle n'existe pas ou n'appartient pas à l'utilisateur.
export function useActivite(id: string | undefined) {
  return useQuery({
    queryKey: cles.activite(id),
    queryFn: () => lireActivite(id as string),
    enabled: id !== undefined,
    // Toujours relue à l'ouverture du formulaire : on modifie la valeur à jour.
    staleTime: 0,
  })
}

// Activité la plus récemment créée par l'utilisateur : sa nature est proposée
// par défaut à la saisie suivante. `data` vaut null s'il n'en a aucune.
export function useDerniereActivite() {
  const userId = useAuth().session?.user.id

  return useQuery({
    queryKey: cles.derniereActivite(userId),
    queryFn: () => lireDerniereActivite(userId as string),
    enabled: userId !== undefined,
  })
}
