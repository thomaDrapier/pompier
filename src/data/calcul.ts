// Calcul d'une période : conversion des lignes de la base, appel du moteur,
// puis sélection des activités de la période. Fonction pure.

import { calculerActivites, totaliser } from '@/engine'
import type { ResultatActivite, Totaux } from '@/engine'
import { versActivite, versHistoriqueGrade, versNature, versTaux } from '@/data/conversions'
import type {
  LigneActivite,
  LigneHistoriqueGrade,
  LigneNature,
  LigneTaux,
} from '@/data/conversions'
import { estDansPeriode } from '@/data/periode'
import type { Periode } from '@/data/periode'

export interface CalculPeriode {
  /** Activités de la période (celles qui y commencent), par début croissant. */
  activites: LigneActivite[]
  /** Résultat du moteur pour chacune, dans le même ordre que `activites`. */
  resultats: ResultatActivite[]
  /** Totaux de la période (activités « ok » uniquement, D-011). */
  totaux: Totaux
}

/**
 * Calcule les résultats et les totaux d'une période.
 *
 * @param lignes activités lues pour la période, élargies à celles qui
 *   chevauchent ses astreintes (voir lireActivitesPourCalcul). Le moteur
 *   travaille sur l'ensemble élargi pour que les déductions et la détection des
 *   chevauchements soient exactes ; seuls les résultats des activités de la
 *   période sont ensuite conservés et totalisés.
 */
export function calculerPeriode(
  lignes: readonly LigneActivite[],
  natures: readonly LigneNature[],
  historiqueGrades: readonly LigneHistoriqueGrade[],
  taux: readonly LigneTaux[],
  periode: Periode,
): CalculPeriode {
  const triees = lignes.toSorted(
    (a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime(),
  )

  const tousLesResultats = calculerActivites(
    triees.map(versActivite),
    natures.map(versNature),
    historiqueGrades.map(versHistoriqueGrade),
    taux.map(versTaux),
  )

  const activites: LigneActivite[] = []
  const resultats: ResultatActivite[] = []
  triees.forEach((ligne, index) => {
    if (estDansPeriode(new Date(ligne.debut), periode)) {
      activites.push(ligne)
      resultats.push(tousLesResultats[index])
    }
  })

  return { activites, resultats, totaux: totaliser(resultats) }
}
