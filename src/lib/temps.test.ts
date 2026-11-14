import { describe, expect, it } from 'vitest'
import {
  arrondirAuQuartDHeure,
  bornesDuMois,
  champsParis,
  dateFinAutomatique,
  dureeEnMinutes,
  estMoisValide,
  instantParis,
  lendemain,
  moisDe,
  moisPrecedent,
  moisSuivant,
} from './temps'

describe('champsParis et instantParis', () => {
  it('convertissent dans les deux sens, en été (UTC+2) comme en hiver (UTC+1)', () => {
    const ete = instantParis('2026-06-26', '08:00')
    const hiver = instantParis('2026-01-15', '08:00')

    expect(ete?.toISOString()).toBe('2026-06-26T06:00:00.000Z')
    expect(hiver?.toISOString()).toBe('2026-01-15T07:00:00.000Z')
    expect(champsParis(new Date('2026-06-26T06:00:00Z'))).toEqual({ date: '2026-06-26', heure: '08:00' })
    expect(champsParis(new Date('2026-01-15T07:00:00Z'))).toEqual({ date: '2026-01-15', heure: '08:00' })
  })

  it('donnent la date de Paris même quand la date UTC est la veille', () => {
    expect(champsParis(new Date('2026-12-31T23:30:00Z'))).toEqual({ date: '2027-01-01', heure: '00:30' })
  })

  it('instantParis renvoie null pour un champ vide, mal formé ou inexistant', () => {
    expect(instantParis('', '08:00')).toBeNull()
    expect(instantParis('2026-06-26', '')).toBeNull()
    expect(instantParis('26/06/2026', '08:00')).toBeNull()
    expect(instantParis('2026-02-30', '08:00')).toBeNull()
    expect(instantParis('2026-06-26', '25:00')).toBeNull()
  })
})

describe('arrondirAuQuartDHeure', () => {
  function arrondi(date: string, heure: string, secondes = 0): string {
    const instant = new Date((instantParis(date, heure) as Date).getTime() + secondes * 1000)
    return champsParis(arrondirAuQuartDHeure(instant)).heure
  }

  it('arrondit au quart d’heure le plus proche', () => {
    expect(arrondi('2026-06-26', '08:00')).toBe('08:00')
    expect(arrondi('2026-06-26', '08:07')).toBe('08:00')
    expect(arrondi('2026-06-26', '08:08')).toBe('08:15')
    expect(arrondi('2026-06-26', '08:22')).toBe('08:15')
    expect(arrondi('2026-06-26', '08:23')).toBe('08:30')
    expect(arrondi('2026-06-26', '08:52')).toBe('08:45')
  })

  it('à égale distance (7 min 30 s), arrondit vers le haut', () => {
    expect(arrondi('2026-06-26', '08:07', 29)).toBe('08:00')
    expect(arrondi('2026-06-26', '08:07', 30)).toBe('08:15')
  })

  it('passe à l’heure et au jour suivants', () => {
    expect(arrondi('2026-06-26', '08:53')).toBe('09:00')
    const minuit = arrondirAuQuartDHeure(instantParis('2026-06-26', '23:55') as Date)
    expect(champsParis(minuit)).toEqual({ date: '2026-06-27', heure: '00:00' })
  })

  it('reste juste la nuit du passage à l’heure d’hiver (25/10/2026, 03:00 → 02:00)', () => {
    // 00:52 UTC = 02:52 heure d'été ; un quart d'heure plus tard, il est 02:00 heure d'hiver.
    const avant = new Date('2026-10-25T00:52:00Z')
    expect(champsParis(avant)).toEqual({ date: '2026-10-25', heure: '02:52' })
    expect(arrondirAuQuartDHeure(avant).toISOString()).toBe('2026-10-25T00:45:00.000Z')
    expect(arrondirAuQuartDHeure(new Date('2026-10-25T00:53:00Z')).toISOString()).toBe(
      '2026-10-25T01:00:00.000Z',
    )
    expect(champsParis(new Date('2026-10-25T01:00:00Z')).heure).toBe('02:00')
  })

  it('reste juste la nuit du passage à l’heure d’été (28/03/2027, 02:00 → 03:00)', () => {
    // 00:53 UTC = 01:53 heure d'hiver ; l'arrondi donne 01:00 UTC, soit 03:00 heure d'été.
    const avant = new Date('2027-03-28T00:53:00Z')
    expect(champsParis(avant)).toEqual({ date: '2027-03-28', heure: '01:53' })
    const arrondiInstant = arrondirAuQuartDHeure(avant)
    expect(arrondiInstant.toISOString()).toBe('2027-03-28T01:00:00.000Z')
    expect(champsParis(arrondiInstant)).toEqual({ date: '2027-03-28', heure: '03:00' })
  })
})

describe('lendemain et dateFinAutomatique', () => {
  it('lendemain passe au mois et à l’année suivants', () => {
    expect(lendemain('2026-06-26')).toBe('2026-06-27')
    expect(lendemain('2026-06-30')).toBe('2026-07-01')
    expect(lendemain('2026-12-31')).toBe('2027-01-01')
    expect(lendemain('2028-02-28')).toBe('2028-02-29')
  })

  it('18:00 → 08:00 donne le lendemain', () => {
    expect(dateFinAutomatique('2026-06-26', '18:00', '08:00')).toBe('2026-06-27')
  })

  it('08:00 → 12:00 reste le même jour', () => {
    expect(dateFinAutomatique('2026-06-26', '08:00', '12:00')).toBe('2026-06-26')
  })

  it('une heure de fin égale à l’heure de début donne le lendemain (24 h)', () => {
    expect(dateFinAutomatique('2026-06-26', '08:00', '08:00')).toBe('2026-06-27')
  })

  it('sans heure de fin, la date de fin suit la date de début', () => {
    expect(dateFinAutomatique('2026-06-26', '18:00', '')).toBe('2026-06-26')
  })
})

describe('dureeEnMinutes', () => {
  it('compte les instants réels : 13 h et 11 h les nuits de changement d’heure', () => {
    expect(
      dureeEnMinutes(
        instantParis('2026-10-24', '20:00') as Date,
        instantParis('2026-10-25', '08:00') as Date,
      ),
    ).toBe(13 * 60)
    expect(
      dureeEnMinutes(
        instantParis('2027-03-27', '20:00') as Date,
        instantParis('2027-03-28', '08:00') as Date,
      ),
    ).toBe(11 * 60)
  })
})

describe('mois', () => {
  it('moisDe donne le mois de Paris', () => {
    expect(moisDe(new Date('2026-06-26T06:00:00Z'))).toBe('2026-06')
    // 31/12 à 23:30 UTC = 01/01 à 00:30 à Paris.
    expect(moisDe(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01')
  })

  it('estMoisValide refuse les mois mal formés', () => {
    expect(estMoisValide('2026-06')).toBe(true)
    expect(estMoisValide('2026-13')).toBe(false)
    expect(estMoisValide('2026-6')).toBe(false)
    expect(estMoisValide('juin')).toBe(false)
    expect(estMoisValide('')).toBe(false)
    expect(estMoisValide(null)).toBe(false)
  })

  it('moisPrecedent et moisSuivant changent d’année', () => {
    expect(moisPrecedent('2026-06')).toBe('2026-05')
    expect(moisPrecedent('2026-01')).toBe('2025-12')
    expect(moisSuivant('2026-06')).toBe('2026-07')
    expect(moisSuivant('2026-12')).toBe('2027-01')
  })

  it('bornesDuMois va du 1er à 00:00 au 1er du mois suivant à 00:00, heure de Paris', () => {
    expect(bornesDuMois('2026-06')).toEqual({
      debut: new Date('2026-05-31T22:00:00Z'),
      fin: new Date('2026-06-30T22:00:00Z'),
    })
    // Octobre contient le passage à l'heure d'hiver : début en UTC+2, fin en UTC+1.
    expect(bornesDuMois('2026-10')).toEqual({
      debut: new Date('2026-09-30T22:00:00Z'),
      fin: new Date('2026-10-31T23:00:00Z'),
    })
  })
})
