import { useQuery } from '@tanstack/react-query'
import { cles } from '@/data/cles'
import type { Periode } from '@/data/periode'
import { lireActivitesPourPeriode } from '@/data/requetes'
import { useAuth } from '@/features/auth/useAuth'
import { useReferentiel } from '@/hooks/useReferentiel'

// Activités nécessaires au calcul d'une période [debut, fin) : celles de la
// période, plus celles qui chevauchent ses astreintes (voir src/data/periode.ts).
// Pour n'afficher que les activités de la période, utiliser useCalculPeriode.
export function useActivitesPeriode(periode: Periode) {
  const userId = useAuth().session?.user.id
  const referentiel = useReferentiel()
  const natures = referentiel.data?.natures

  return useQuery({
    queryKey: cles.activitesPeriode(userId, periode),
    queryFn: () =>
      lireActivitesPourPeriode(
        userId as string,
        periode,
        (natures ?? []).filter((nature) => nature.est_astreinte).map((nature) => nature.id),
      ),
    // Il faut connaître l'utilisateur et les natures d'astreinte avant de lire.
    enabled: userId !== undefined && natures !== undefined,
  })
}
