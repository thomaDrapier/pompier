// Périodes des restitutions (cahier des charges 3.8, D-033) : jour, semaine
// ISO (lundi à dimanche) et mois calendaire, toujours en heure de Paris.
//
// Une période est une plage semi-ouverte [debut, fin) en millisecondes UTC,
// comme les plages du moteur (src/engine/intervalles.ts). Ses limites sont des
// minuits de Paris : une semaine qui contient un changement d'heure dure donc
// 167 h (passage à l'heure d'été) ou 169 h (passage à l'heure d'hiver).
//
// Chaque période porte une clé texte, utilisable dans une adresse :
// jour « 2026-11-17 », semaine ISO « 2026-W47 », mois « 2026-11 ».
//
// Module pur : aucune dépendance à React ni à Supabase.

import { TZDate } from '@date-fns/tz'
import { addDays, addMonths, addWeeks, format, startOfISOWeek } from 'date-fns'

const FUSEAU = 'Europe/Paris'

/** Une période nommée : sa clé et ses limites [debut, fin) en millisecondes UTC. */
export interface PeriodeNommee {
  cle: string
  debut: number
  fin: number
}

const MOTIF_JOUR = /^(\d{4})-(\d{2})-(\d{2})$/
const MOTIF_SEMAINE = /^(\d{4})-W(\d{2})$/
const MOTIF_MOIS = /^(\d{4})-(\d{2})$/

/** Minuit de Paris du jour donné (mois de 1 à 12). */
function minuitParis(annee: number, mois: number, jour: number): TZDate {
  return new TZDate(annee, mois - 1, jour, 0, 0, FUSEAU)
}

function aParis(instant: number | Date): TZDate {
  return new TZDate(typeof instant === 'number' ? instant : instant.getTime(), FUSEAU)
}

// ---------------------------------------------------------------------------
// Clés d'un instant
// ---------------------------------------------------------------------------

/** Jour de Paris d'un instant : « 2026-11-17 ». */
export function cleJour(instant: number | Date): string {
  return format(aParis(instant), 'yyyy-MM-dd')
}

/**
 * Semaine ISO de Paris d'un instant : « 2026-W47 ». L'année est celle de la
 * semaine ISO : le 31/12/2024 appartient à la semaine « 2025-W01 ».
 */
export function cleSemaine(instant: number | Date): string {
  return format(aParis(instant), "RRRR-'W'II")
}

/** Mois de Paris d'un instant : « 2026-11 ». */
export function cleMois(instant: number | Date): string {
  return format(aParis(instant), 'yyyy-MM')
}

// ---------------------------------------------------------------------------
// Validation des clés (paramètres d'adresse)
// ---------------------------------------------------------------------------

/** Vrai pour une clé de jour existante (« 2026-02-29 » est refusée). */
export function estCleJour(cle: string | null | undefined): cle is string {
  if (typeof cle !== 'string') return false
  const m = MOTIF_JOUR.exec(cle)
  if (m === null) return false
  const [annee, mois, jour] = m.slice(1).map(Number)
  return cleJour(minuitParis(annee, mois, jour)) === cle
}

/** Vrai pour une clé de semaine ISO existante (« 2025-W53 » est refusée, 2025 n’ayant que 52 semaines). */
export function estCleSemaine(cle: string | null | undefined): cle is string {
  if (typeof cle !== 'string') return false
  const m = MOTIF_SEMAINE.exec(cle)
  if (m === null || Number(m[2]) < 1) return false
  return cleSemaine(lundiDeLaSemaine(Number(m[1]), Number(m[2]))) === cle
}

/** Vrai pour une clé de mois valide (« 2026-11 »). */
export function estCleMois(cle: string | null | undefined): cle is string {
  if (typeof cle !== 'string') return false
  const m = MOTIF_MOIS.exec(cle)
  return m !== null && Number(m[2]) >= 1 && Number(m[2]) <= 12
}

// ---------------------------------------------------------------------------
// Limites d'une période
// ---------------------------------------------------------------------------

/** Jour « AAAA-MM-JJ » : de minuit à minuit, heure de Paris. */
export function periodeJour(cle: string): PeriodeNommee {
  if (!estCleJour(cle)) throw new Error(`Jour invalide : ${cle}.`)
  const [annee, mois, jour] = cle.split('-').map(Number)
  const debut = minuitParis(annee, mois, jour)
  return { cle, debut: debut.getTime(), fin: addDays(debut, 1).getTime() }
}

/** Lundi 0 h (Paris) de la semaine ISO n° `numero` de l'année ISO `annee`. */
function lundiDeLaSemaine(annee: number, numero: number): TZDate {
  // Le 4 janvier appartient toujours à la semaine 1 (norme ISO 8601).
  const lundiSemaine1 = startOfISOWeek(minuitParis(annee, 1, 4))
  return addWeeks(lundiSemaine1, numero - 1)
}

/** Semaine ISO « AAAA-Www » : du lundi 0 h au lundi suivant 0 h, heure de Paris. */
export function periodeSemaine(cle: string): PeriodeNommee {
  if (!estCleSemaine(cle)) throw new Error(`Semaine invalide : ${cle}.`)
  const [annee, numero] = cle.split('-W').map(Number)
  const lundi = lundiDeLaSemaine(annee, numero)
  return { cle, debut: lundi.getTime(), fin: addWeeks(lundi, 1).getTime() }
}

/** Mois « AAAA-MM » : du 1er à 0 h au 1er du mois suivant à 0 h, heure de Paris. */
export function periodeMois(cle: string): PeriodeNommee {
  if (!estCleMois(cle)) throw new Error(`Mois invalide : ${cle}.`)
  const [annee, mois] = cle.split('-').map(Number)
  const debut = minuitParis(annee, mois, 1)
  return { cle, debut: debut.getTime(), fin: addMonths(debut, 1).getTime() }
}

// ---------------------------------------------------------------------------
// Sous-périodes et suites de périodes
// ---------------------------------------------------------------------------

/** Les 7 jours d'une semaine ISO, du lundi au dimanche. */
export function joursDeLaSemaine(cle: string): PeriodeNommee[] {
  const lundi = aParis(periodeSemaine(cle).debut)
  return Array.from({ length: 7 }, (_, i) => periodeJour(format(addDays(lundi, i), 'yyyy-MM-dd')))
}

/**
 * Semaines ISO d'un mois, limitées au mois : la première commence le 1er,
 * la dernière s'arrête à la fin du mois (clé de la semaine ISO entière).
 */
export function semainesDuMois(cle: string): PeriodeNommee[] {
  const mois = periodeMois(cle)
  const semaines: PeriodeNommee[] = []
  let lundi = startOfISOWeek(aParis(mois.debut))
  while (lundi.getTime() < mois.fin) {
    const fin = addWeeks(lundi, 1).getTime()
    semaines.push({
      cle: cleSemaine(lundi),
      debut: Math.max(lundi.getTime(), mois.debut),
      fin: Math.min(fin, mois.fin),
    })
    lundi = addWeeks(lundi, 1)
  }
  return semaines
}

/** Mois décalé de `ecart` mois : decalerMois('2026-01', -1) = '2025-12'. */
export function decalerMois(cle: string, ecart: number): string {
  return cleMois(addMonths(aParis(periodeMois(cle).debut), ecart))
}

/** Semaine ISO décalée de `ecart` semaines. */
export function decalerSemaine(cle: string, ecart: number): string {
  return cleSemaine(addWeeks(aParis(periodeSemaine(cle).debut), ecart))
}

/** Les `nombre` mois se terminant au mois `fin` (inclus), du plus ancien au plus récent. */
export function moisGlissants(fin: string, nombre = 12): string[] {
  return Array.from({ length: nombre }, (_, i) => decalerMois(fin, i - nombre + 1))
}

/** Les 12 mois d'une année civile, de janvier à décembre. */
export function moisDeLAnnee(annee: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${annee}-${String(i + 1).padStart(2, '0')}`)
}
