// Dates et heures de l'application, toujours en Europe/Paris, quel que soit
// le fuseau de l'appareil. Fonctions pures.
//
// Deux représentations coexistent :
// - un instant absolu (`Date`), envoyé à la base et au moteur de calcul ;
// - les champs d'un formulaire : une date « AAAA-MM-JJ » et une heure « HH:MM »,
//   lues à l'horloge de Paris (valeurs des champs natifs date et heure).

import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import type { Periode } from '@/data/periode'

const FUSEAU = 'Europe/Paris'
const MS_PAR_QUART_D_HEURE = 15 * 60_000

/** Date et heure de Paris, au format des champs natifs d'un formulaire. */
export interface ChampsDateHeure {
  /** AAAA-MM-JJ */
  date: string
  /** HH:MM (24 h) */
  heure: string
}

/** Date et heure de Paris d'un instant. */
export function champsParis(instant: Date): ChampsDateHeure {
  const aParis = new TZDate(instant.getTime(), FUSEAU)
  return { date: format(aParis, 'yyyy-MM-dd'), heure: format(aParis, 'HH:mm') }
}

/**
 * Instant correspondant à une date et une heure de Paris.
 * Renvoie null si l'un des champs est vide, mal formé ou n'existe pas
 * (30 février, 25:00…).
 */
export function instantParis(date: string, heure: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const h = /^(\d{2}):(\d{2})$/.exec(heure)
  if (d === null || h === null) return null

  const [annee, mois, jour] = d.slice(1).map(Number)
  const [heures, minutes] = h.slice(1).map(Number)
  if (heures > 23 || minutes > 59) return null

  const instant = new Date(new TZDate(annee, mois - 1, jour, heures, minutes, FUSEAU).getTime())
  // Une date inexistante est reportée par le calendrier (31/02 → 03/03) : refusée.
  if (Number.isNaN(instant.getTime()) || champsParis(instant).date !== date) return null
  return instant
}

/**
 * Arrondit un instant au quart d'heure le plus proche ; à égale distance
 * (7 min 30 s), l'arrondi se fait vers le haut.
 *
 * Le décalage de Paris avec l'UTC étant toujours un nombre entier d'heures,
 * les quarts d'heure de Paris sont aussi ceux de l'UTC : l'arrondi se fait sur
 * l'instant absolu et reste juste au changement d'heure.
 */
export function arrondirAuQuartDHeure(instant: Date): Date {
  const quarts = Math.floor((instant.getTime() + MS_PAR_QUART_D_HEURE / 2) / MS_PAR_QUART_D_HEURE)
  return new Date(quarts * MS_PAR_QUART_D_HEURE)
}

/** Lendemain d'une date AAAA-MM-JJ (calendrier, sans notion de fuseau). */
export function lendemain(date: string): string {
  const [annee, mois, jour] = date.split('-').map(Number)
  return new Date(Date.UTC(annee, mois - 1, jour + 1)).toISOString().slice(0, 10)
}

/**
 * Date de fin proposée tant que l'utilisateur ne l'a pas modifiée lui-même
 * (spécifications des écrans, « Fin au lendemain ») : la date de début, ou le
 * lendemain si l'heure de fin saisie est inférieure ou égale à l'heure de
 * début (astreinte de nuit : 18:00 → 08:00).
 */
export function dateFinAutomatique(dateDebut: string, heureDebut: string, heureFin: string): string {
  if (dateDebut === '' || heureDebut === '' || heureFin === '') return dateDebut
  return heureFin <= heureDebut ? lendemain(dateDebut) : dateDebut
}

/** Durée entre deux instants, en minutes entières (instants réels : juste au changement d'heure). */
export function dureeEnMinutes(debut: Date, fin: Date): number {
  return Math.round((fin.getTime() - debut.getTime()) / 60_000)
}

// ---------------------------------------------------------------------------
// Mois calendaires de Paris, écrits « AAAA-MM »
// ---------------------------------------------------------------------------

/** Mois de Paris auquel appartient un instant. */
export function moisDe(instant: Date): string {
  return champsParis(instant).date.slice(0, 7)
}

/** Vrai pour un mois bien formé (« 2026-06 »). */
export function estMoisValide(mois: string | null | undefined): mois is string {
  return typeof mois === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mois)
}

function decalerMois(mois: string, ecart: number): string {
  const [annee, numero] = mois.split('-').map(Number)
  return new Date(Date.UTC(annee, numero - 1 + ecart, 1)).toISOString().slice(0, 7)
}

export function moisPrecedent(mois: string): string {
  return decalerMois(mois, -1)
}

export function moisSuivant(mois: string): string {
  return decalerMois(mois, 1)
}

/**
 * Période [début, fin) d'un mois de Paris : du 1er à 00:00 au 1er du mois
 * suivant à 00:00, heure de Paris.
 */
export function bornesDuMois(mois: string): Periode {
  const debut = instantParis(`${mois}-01`, '00:00')
  const fin = instantParis(`${moisSuivant(mois)}-01`, '00:00')
  if (debut === null || fin === null) {
    throw new Error(`Mois invalide : ${mois}.`)
  }
  return { debut, fin }
}
