import type { QueryClient } from '@tanstack/react-query'
import { cles } from '@/data/cles'

/**
 * Après une écriture du référentiel (grade, nature, taux) ou de l'historique
 * de grades, marque périmées toutes les lectures dont dépendent les écrans et
 * les calculs de période : référentiel, historiques de grades et activités.
 *
 * Les montants ne sont jamais stockés (cahier des charges, section 7) : ils
 * sont recalculés à partir de ces lectures. Une date d'effet passée, une
 * correction ou une suppression change donc aussitôt les montants affichés
 * (D-019, D-020, D-021).
 */
export function invaliderReferentielEtCalculs(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: cles.referentiel }),
    queryClient.invalidateQueries({ queryKey: cles.historiquesGrades }),
    queryClient.invalidateQueries({ queryKey: cles.activites }),
  ]).then(() => undefined)
}
