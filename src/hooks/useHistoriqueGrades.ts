import { useQuery } from '@tanstack/react-query'
import { cles } from '@/data/cles'
import { lireHistoriqueGrades } from '@/data/requetes'
import { useAuth } from '@/features/auth/useAuth'

// Historique des grades de l'utilisateur connecté (une ligne par promotion).
export function useHistoriqueGrades() {
  const userId = useAuth().session?.user.id

  return useQuery({
    queryKey: cles.historiqueGrades(userId),
    queryFn: () => lireHistoriqueGrades(userId as string),
    // Pas de lecture tant que personne n'est connecté.
    enabled: userId !== undefined,
  })
}
