// Formats d'affichage français (spécifications des écrans, section 1).
// Dates et heures toujours en Europe/Paris. Fonctions pures.

import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const FUSEAU = 'Europe/Paris'

function aParis(instant: Date): TZDate {
  return new TZDate(instant.getTime(), FUSEAU)
}

/** « ven. 26/06/2026 » */
export function formaterDate(instant: Date): string {
  return format(aParis(instant), 'EEE dd/MM/yyyy', { locale: fr })
}

/** « 08:00 » (24 h) */
export function formaterHeure(instant: Date): string {
  return format(aParis(instant), 'HH:mm')
}

/**
 * Date, heure de début et heure de fin ; la date de fin n'apparaît que si elle
 * diffère de la date de début.
 * « ven. 26/06/2026 08:00 – 12:00 » ou « sam. 24/10/2026 20:00 – dim. 25/10/2026 08:00 ».
 */
export function formaterPlage(debut: Date, fin: Date): string {
  const dateDebut = formaterDate(debut)
  const dateFin = formaterDate(fin)
  const finTexte = dateFin === dateDebut ? formaterHeure(fin) : `${dateFin} ${formaterHeure(fin)}`
  return `${dateDebut} ${formaterHeure(debut)} – ${finTexte}`
}

/** Durée en minutes → « 3 h 15 », « 0 h 45 », « 13 h 00 ». */
export function formaterDuree(minutes: number): string {
  const heures = Math.floor(minutes / 60)
  const reste = minutes % 60
  return `${heures} h ${String(reste).padStart(2, '0')}`
}

/** Montant en centimes → « 15,50 € », « 1 234,05 € ». */
export function formaterMontant(centimes: number): string {
  const euros = Math.floor(centimes / 100)
  const reste = centimes % 100
  const eurosTexte = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${eurosTexte},${String(reste).padStart(2, '0')} €`
}

/** Mois « 2026-06 » → « juin 2026 ». */
export function formaterMois(mois: string): string {
  const [annee, numero] = mois.split('-').map(Number)
  return format(new Date(annee, numero - 1, 1), 'MMMM yyyy', { locale: fr })
}
