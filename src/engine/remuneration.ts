// Calcul du montant d'une activité (cahier des charges 3.5, D-012).

/**
 * Montant en centimes = durée (minutes) × taux (centimes par heure) / 60,
 * arrondi au centime le plus proche, le demi-centime étant arrondi vers le
 * haut. L'arrondi se fait par activité.
 *
 * Le calcul reste en nombres entiers : ajouter 30 avant la division entière
 * par 60 revient à ajouter un demi-centime avant de tronquer.
 *
 * Exemple : 7 min à 12,34 €/h → 7 × 1234 = 8638 ; (8638 + 30) / 60 = 144,47
 * → 144 centimes (1,4397 € arrondi à 1,44 €).
 *
 * @param dureeMin durée retenue : nette pour une astreinte, déclarée sinon
 * @param centimesParHeure taux horaire en centimes entiers
 */
export function calculerMontantCentimes(dureeMin: number, centimesParHeure: number): number {
  if (!Number.isInteger(dureeMin) || dureeMin < 0) {
    throw new Error(`Durée invalide : ${dureeMin} (minutes entières positives attendues).`)
  }
  if (!Number.isInteger(centimesParHeure) || centimesParHeure < 0) {
    throw new Error(
      `Taux invalide : ${centimesParHeure} (centimes entiers positifs par heure attendus).`,
    )
  }
  return Math.floor((dureeMin * centimesParHeure + 30) / 60)
}
