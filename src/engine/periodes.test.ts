import { describe, expect, it } from 'vitest'
import { paris } from './aides-test'
import {
  cleJour,
  cleMois,
  cleSemaine,
  decalerMois,
  decalerSemaine,
  estCleJour,
  estCleMois,
  estCleSemaine,
  joursDeLaSemaine,
  moisDeLAnnee,
  moisGlissants,
  periodeJour,
  periodeMois,
  periodeSemaine,
  semainesDuMois,
} from './periodes'

const HEURE = 3_600_000

function heures(periode: { debut: number; fin: number }): number {
  return (periode.fin - periode.debut) / HEURE
}

describe('clés d’un instant (heure de Paris)', () => {
  it('jour, semaine ISO et mois de Paris', () => {
    const instant = paris('2026-11-17 10:00')
    expect(cleJour(instant)).toBe('2026-11-17')
    expect(cleSemaine(instant)).toBe('2026-W47')
    expect(cleMois(instant)).toBe('2026-11')
  })

  it('le 01/01 à 00:30 à Paris (31/12 en UTC) est bien le 1er janvier', () => {
    const instant = paris('2027-01-01 00:30')
    expect(cleJour(instant)).toBe('2027-01-01')
    expect(cleMois(instant)).toBe('2027-01')
  })

  it('semaine ISO 1 à cheval sur deux années : le 31/12/2025 est en « 2026-W01 »', () => {
    expect(cleSemaine(paris('2025-12-31 12:00'))).toBe('2026-W01')
    expect(cleSemaine(paris('2024-12-30 12:00'))).toBe('2025-W01')
    // Et le 01/01/2027 (vendredi) est encore dans la dernière semaine de 2026.
    expect(cleSemaine(paris('2027-01-01 12:00'))).toBe('2026-W53')
  })
})

describe('validation des clés', () => {
  it('jours : refuse une date inexistante (février bissextile)', () => {
    expect(estCleJour('2028-02-29')).toBe(true)
    expect(estCleJour('2027-02-29')).toBe(false)
    expect(estCleJour('2026-13-01')).toBe(false)
    expect(estCleJour(null)).toBe(false)
  })

  it('semaines : la semaine 53 n’existe que certaines années', () => {
    expect(estCleSemaine('2026-W53')).toBe(true)
    expect(estCleSemaine('2025-W53')).toBe(false)
    expect(estCleSemaine('2026-W00')).toBe(false)
    expect(estCleSemaine('2026-47')).toBe(false)
  })

  it('mois', () => {
    expect(estCleMois('2026-11')).toBe(true)
    expect(estCleMois('2026-13')).toBe(false)
    expect(estCleMois('2026-1')).toBe(false)
  })
})

describe('limites des périodes', () => {
  it('un jour va de minuit à minuit, heure de Paris', () => {
    const jour = periodeJour('2026-11-17')
    expect(jour.debut).toBe(paris('2026-11-17 00:00').getTime())
    expect(heures(jour)).toBe(24)
  })

  it('jours du changement d’heure : 23 h au printemps, 25 h à l’automne', () => {
    expect(heures(periodeJour('2026-03-29'))).toBe(23)
    expect(heures(periodeJour('2026-10-25'))).toBe(25)
  })

  it('semaine ISO : du lundi 0 h au lundi suivant 0 h', () => {
    const semaine = periodeSemaine('2026-W47')
    expect(semaine.debut).toBe(paris('2026-11-16 00:00').getTime())
    expect(semaine.fin).toBe(paris('2026-11-23 00:00').getTime())
    expect(heures(semaine)).toBe(168)
  })

  it('semaines du changement d’heure : 167 h (printemps) et 169 h (automne)', () => {
    expect(heures(periodeSemaine('2026-W13'))).toBe(167) // contient le 29/03/2026
    expect(heures(periodeSemaine('2026-W43'))).toBe(169) // contient le 25/10/2026
  })

  it('semaine ISO 1 de 2026 : commence le lundi 29/12/2025', () => {
    expect(periodeSemaine('2026-W01').debut).toBe(paris('2025-12-29 00:00').getTime())
  })

  it('mois : du 1er à 0 h au 1er du mois suivant, février bissextile compris', () => {
    const fevrier = periodeMois('2028-02')
    expect(fevrier.debut).toBe(paris('2028-02-01 00:00').getTime())
    expect(fevrier.fin).toBe(paris('2028-03-01 00:00').getTime())
    expect(heures(fevrier)).toBe(29 * 24)
    expect(heures(periodeMois('2027-02'))).toBe(28 * 24)
    // Décembre s'arrête au 1er janvier suivant.
    expect(periodeMois('2026-12').fin).toBe(paris('2027-01-01 00:00').getTime())
  })

  it('refuse une clé invalide', () => {
    expect(() => periodeMois('2026-13')).toThrow('Mois invalide')
    expect(() => periodeSemaine('2025-W53')).toThrow('Semaine invalide')
    expect(() => periodeJour('2026-02-30')).toThrow('Jour invalide')
  })
})

describe('sous-périodes', () => {
  it('jours d’une semaine : du lundi au dimanche, dimanche de 23 h au printemps', () => {
    const jours = joursDeLaSemaine('2026-W13')
    expect(jours.map((jour) => jour.cle)).toEqual([
      '2026-03-23',
      '2026-03-24',
      '2026-03-25',
      '2026-03-26',
      '2026-03-27',
      '2026-03-28',
      '2026-03-29',
    ])
    expect(heures(jours[6])).toBe(23)
    // Les jours se suivent sans trou.
    expect(jours[6].fin).toBe(periodeSemaine('2026-W13').fin)
  })

  it('semaines ISO d’un mois, limitées au mois', () => {
    // Novembre 2026 : du dimanche 1er au lundi 30.
    const semaines = semainesDuMois('2026-11')
    expect(semaines.map((semaine) => semaine.cle)).toEqual([
      '2026-W44',
      '2026-W45',
      '2026-W46',
      '2026-W47',
      '2026-W48',
      '2026-W49',
    ])
    expect(semaines[0].debut).toBe(paris('2026-11-01 00:00').getTime())
    expect(heures(semaines[0])).toBe(24)
    expect(heures(semaines[5])).toBe(24)
    expect(semaines[5].fin).toBe(periodeMois('2026-11').fin)
  })

  it('un mois qui commence un lundi n’a pas de semaine tronquée au début', () => {
    // Juin 2026 commence un lundi.
    const semaines = semainesDuMois('2026-06')
    expect(semaines[0]).toEqual(periodeSemaine('2026-W23'))
  })
})

describe('suites de périodes', () => {
  it('décalage d’un mois ou d’une semaine, changement d’année compris', () => {
    expect(decalerMois('2026-01', -1)).toBe('2025-12')
    expect(decalerMois('2026-12', 1)).toBe('2027-01')
    expect(decalerSemaine('2026-W01', -1)).toBe('2025-W52')
    expect(decalerSemaine('2026-W53', 1)).toBe('2027-W01')
  })

  it('12 mois glissants se terminant au mois donné', () => {
    expect(moisGlissants('2026-11')).toEqual([
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ])
    expect(moisGlissants('2026-11', 3)).toEqual(['2026-09', '2026-10', '2026-11'])
  })

  it('année civile : janvier à décembre', () => {
    expect(moisDeLAnnee(2026)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ])
  })
})
