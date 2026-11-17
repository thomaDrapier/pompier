import { useMemo, useState } from 'react'
import { cleMois, moisDeLAnnee, moisGlissants } from '@/engine'
import type { Periode } from '@/data/periode'
import {
  calculerDetaille,
  plageHistorique,
  plageMois,
  plageSemaine,
  restituerHistorique,
  restituerMois,
  restituerSemaine,
} from '@/data/restitutions'
import type {
  CalculDetaille,
  RestitutionHistorique,
  RestitutionMois,
  RestitutionSemaine,
} from '@/data/restitutions'
import { useActivitesPeriode } from '@/hooks/useActivitesPeriode'
import { useHistoriqueGrades } from '@/hooks/useHistoriqueGrades'
import { useReferentiel } from '@/hooks/useReferentiel'

// Restitutions du J3 (spécifications des écrans, sections 7 à 9) : une
// semaine, un mois (avec le mois précédent) ou un historique.
//
// Chaque hook lit TOUTE sa plage en une fois (useActivitesPeriode : lecture
// élargie de D-015, clé ['activites', utilisateur, début, fin]), calcule les
// activités une seule fois, puis les regroupe par période. Les clés lues sont
// celles du référentiel, de l'historique de grades et des activités :
// invaliderReferentielEtCalculs (D-029) et les écritures d'activités les
// relancent, et les restitutions se recalculent seules. Rien n'est stocké.

/** État d'une restitution : ses données, ou le chargement, ou l'erreur. */
export interface EtatRestitution<T> {
  donnees: T | null
  enChargement: boolean
  erreur: Error | null
}

/** Lit et calcule les activités d'une plage, puis applique `restituer`. */
function useRestitution<T>(
  plage: Periode,
  restituer: (calcul: CalculDetaille) => T,
): EtatRestitution<T> {
  const referentiel = useReferentiel()
  const historique = useHistoriqueGrades()
  const activites = useActivitesPeriode(plage)

  return useMemo(() => {
    const erreurLecture = referentiel.error ?? historique.error ?? activites.error
    if (erreurLecture) return { donnees: null, enChargement: false, erreur: erreurLecture }
    if (!referentiel.data || !historique.data || !activites.data) {
      return { donnees: null, enChargement: true, erreur: null }
    }
    try {
      const calcul = calculerDetaille(
        activites.data,
        referentiel.data.natures,
        historique.data,
        referentiel.data.taux,
      )
      return { donnees: restituer(calcul), enChargement: false, erreur: null }
    } catch (erreur) {
      // Donnée impossible pour le moteur (D-012) : signalée sans planter l'écran.
      return {
        donnees: null,
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
    restituer,
  ])
}

/** Semaine ISO « AAAA-Www » : totaux de la semaine et de chacun de ses jours. */
export function useRestitutionSemaine(cle: string): EtatRestitution<RestitutionSemaine> {
  const plage = useMemo(() => plageSemaine(cle), [cle])
  const restituer = useMemo(() => (calcul: CalculDetaille) => restituerSemaine(calcul, cle), [cle])
  return useRestitution(plage, restituer)
}

/** Mois « AAAA-MM » : totaux du mois, du mois précédent, écart, semaines du mois. */
export function useRestitutionMois(cle: string): EtatRestitution<RestitutionMois> {
  const plage = useMemo(() => plageMois(cle), [cle])
  const restituer = useMemo(() => (calcul: CalculDetaille) => restituerMois(calcul, cle), [cle])
  return useRestitution(plage, restituer)
}

/** Historique : 12 mois glissants se terminant au mois donné, ou année civile. */
export type ModeHistorique = { mode: 'glissant'; fin: string } | { mode: 'annee'; annee: number }

export function useRestitutionHistorique(
  choix: ModeHistorique,
): EtatRestitution<RestitutionHistorique> {
  // Mois en cours à Paris, lu une seule fois : les mois postérieurs sont à vide.
  const [moisCourant] = useState(() => cleMois(new Date()))
  const reference = choix.mode === 'glissant' ? choix.fin : String(choix.annee)
  const mois = useMemo(
    () => (choix.mode === 'glissant' ? moisGlissants(reference) : moisDeLAnnee(Number(reference))),
    [choix.mode, reference],
  )
  const plage = useMemo(() => plageHistorique(mois), [mois])
  const restituer = useMemo(
    () => (calcul: CalculDetaille) => restituerHistorique(calcul, mois, moisCourant),
    [mois, moisCourant],
  )
  return useRestitution(plage, restituer)
}
