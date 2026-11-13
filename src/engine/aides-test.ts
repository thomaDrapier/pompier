// Aides réservées aux tests du moteur (ce fichier n'est importé par aucun
// code de l'application).

import { TZDate } from '@date-fns/tz'
import type { Plage } from './intervalles'

/**
 * Construit un instant à partir d'une heure locale de Paris, écrite
 * « AAAA-MM-JJ HH:MM ». Les tests donnent ainsi le même résultat quel que
 * soit le fuseau de la machine qui les exécute.
 */
export function paris(texte: string): Date {
  const morceaux = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(texte)
  if (morceaux === null) {
    throw new Error(`Format attendu « AAAA-MM-JJ HH:MM », reçu « ${texte} ».`)
  }
  const [annee, mois, jour, heure, minute] = morceaux.slice(1).map(Number)
  return new Date(new TZDate(annee, mois - 1, jour, heure, minute, 'Europe/Paris').getTime())
}

/** Plage [debut, fin) à partir de deux heures locales de Paris. */
export function plageParis(debut: string, fin: string): Plage {
  return { debut: paris(debut).getTime(), fin: paris(fin).getTime() }
}
