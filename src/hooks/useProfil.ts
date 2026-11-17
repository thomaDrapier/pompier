import { useQuery } from '@tanstack/react-query'
import { cles } from '@/data/cles'
import { lireProfil } from '@/data/requetes-referentiel'
import { useAuth } from '@/features/auth/useAuth'

// Profil de l'utilisateur connecté : rôle, statut actif et `estAdmin`
// (rôle admin ET actif, même règle que is_admin() dans la base). Sert à
// afficher le menu « Administration » ; la protection reste assurée par la
// base (RLS).
export function useProfil() {
  const userId = useAuth().session?.user.id

  return useQuery({
    queryKey: cles.profil(userId),
    queryFn: () => lireProfil(userId as string),
    enabled: userId !== undefined,
    staleTime: 5 * 60_000,
  })
}
