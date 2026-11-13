import { useMemo } from 'react'
import { calculerPeriode } from '@/data/calcul'
import type { CalculPeriode } from '@/data/calcul'
import type { Periode } from '@/data/periode'
import { useActivitesPeriode } from '@/hooks/useActivitesPeriode'
import { useHistoriqueGrades } from '@/hooks/useHistoriqueGrades'
import { useReferentiel } from '@/hooks/useReferentiel'

export interface EtatCalculPeriode {
  /** Activités, résultats et totaux de la période ; null tant que tout n'est pas lu. */
  calcul: CalculPeriode | null
  /** Vrai tant qu'une des lectures n'est pas terminée. */
  enChargement: boolean
  /** Erreur de lecture ou de calcul, sinon null. */
  erreur: Error | null
}

// Résultats et totaux du moteur de calcul pour une période [debut, fin).
// Le calcul est refait dès qu'une des données change : après chaque saisie,
// modification ou suppression, les lectures sont relancées et les montants se
// mettent à jour seuls. Rien n'est stocké (cahier des charges, section 7).
export function useCalculPeriode(periode: Periode): EtatCalculPeriode {
  const referentiel = useReferentiel()
  const historique = useHistoriqueGrades()
  const activites = useActivitesPeriode(periode)

  // La période est comparée par ses bornes, pas par l'objet reçu : l'appelant
  // peut en recréer un à chaque rendu sans relancer le calcul.
  const debutMs = periode.debut.getTime()
  const finMs = periode.fin.getTime()

  return useMemo(() => {
    const erreurLecture = referentiel.error ?? historique.error ?? activites.error
    if (erreurLecture) {
      return { calcul: null, enChargement: false, erreur: erreurLecture }
    }
    if (!referentiel.data || !historique.data || !activites.data) {
      return { calcul: null, enChargement: true, erreur: null }
    }
    try {
      const calcul = calculerPeriode(
        activites.data,
        referentiel.data.natures,
        historique.data,
        referentiel.data.taux,
        { debut: new Date(debutMs), fin: new Date(finMs) },
      )
      return { calcul, enChargement: false, erreur: null }
    } catch (erreur) {
      // Donnée impossible pour le moteur (D-012) : signalée, sans faire planter l'écran.
      return {
        calcul: null,
        enChargement: false,
        erreur: erreur instanceof Error ? erreur : new Error(String(erreur)),
      }
    }
  }, [
    referentiel.data,
    referentiel.error,
    historique.data,
    historique.error,
    activites.data,
    activites.error,
    debutMs,
    finMs,
  ])
}
