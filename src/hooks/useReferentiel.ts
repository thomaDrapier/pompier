import { useQuery } from '@tanstack/react-query'
import { cles } from '@/data/cles'
import { lireReferentiel } from '@/data/requetes'

// Référentiel unique et commun : natures, grades et taux (lecture seule).
// Il change rarement : il n'est pas redemandé pendant 5 minutes.
export function useReferentiel() {
  return useQuery({
    queryKey: cles.referentiel,
    queryFn: lireReferentiel,
    staleTime: 5 * 60_000,
  })
}
