import { describe, expect, it } from 'vitest'
import { paris } from './aides-test'
import { dateParis, gradeEnVigueur, resoudreTaux, tauxEnVigueur } from './taux'
import type { HistoriqueGrade, Taux } from './types'

// Tous les taux de ce fichier sont fictifs.

describe('dateParis', () => {
  it("donne la date calendaire de Paris, en été comme en hiver", () => {
    expect(dateParis(paris('2026-06-26 08:00'))).toBe('2026-06-26')
    expect(dateParis(paris('2026-01-15 12:00'))).toBe('2026-01-15')
  })

  it('le 31/12 à 23:30 à Paris (22:30 UTC) reste le 31/12', () => {
    const instant = paris('2026-12-31 23:30')

    expect(instant.toISOString()).toBe('2026-12-31T22:30:00.000Z')
    expect(dateParis(instant)).toBe('2026-12-31')
  })

  it('le 01/01 à 00:30 à Paris est le 01/01, alors que la date UTC est encore le 31/12', () => {
    const instant = paris('2027-01-01 00:30')

    expect(instant.toISOString()).toBe('2026-12-31T23:30:00.000Z')
    expect(dateParis(instant)).toBe('2027-01-01')
  })

  it("en été, 01:30 à Paris est la veille en UTC mais bien le jour même à Paris", () => {
    const instant = paris('2026-07-01 01:30')

    expect(instant.toISOString()).toBe('2026-06-30T23:30:00.000Z')
    expect(dateParis(instant)).toBe('2026-07-01')
  })
})

describe('gradeEnVigueur', () => {
  const historique: HistoriqueGrade[] = [
    { gradeId: 'caporal', dateEffet: '2026-07-01' },
    { gradeId: 'sapeur', dateEffet: '2025-01-01' },
  ]

  it("renvoie null avant la première date d'effet", () => {
    expect(gradeEnVigueur(historique, '2024-12-31')).toBeNull()
  })

  it("renvoie le grade dont la date d'effet est la plus récente avant la date", () => {
    expect(gradeEnVigueur(historique, '2025-01-01')).toBe('sapeur')
    expect(gradeEnVigueur(historique, '2026-06-30')).toBe('sapeur')
  })

  it("applique le nouveau grade dès le jour de sa date d'effet", () => {
    expect(gradeEnVigueur(historique, '2026-07-01')).toBe('caporal')
    expect(gradeEnVigueur(historique, '2030-01-01')).toBe('caporal')
  })

  it('renvoie null pour un historique vide', () => {
    expect(gradeEnVigueur([], '2026-06-26')).toBeNull()
  })
})

describe('tauxEnVigueur', () => {
  const taux: Taux[] = [
    { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1300, dateEffet: '2027-01-01' },
    { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1200, dateEffet: '2026-01-01' },
    { gradeId: 'sapeur', natureId: 'astreinte', centimesParHeure: 200, dateEffet: '2026-01-01' },
    { gradeId: 'caporal', natureId: 'intervention', centimesParHeure: 1400, dateEffet: '2026-01-01' },
  ]

  it('choisit la ligne du bon couple (grade, nature)', () => {
    expect(tauxEnVigueur(taux, 'sapeur', 'astreinte', '2026-06-26')).toBe(200)
    expect(tauxEnVigueur(taux, 'caporal', 'intervention', '2026-06-26')).toBe(1400)
  })

  it("garde l'ancien taux jusqu'à la veille de la nouvelle date d'effet", () => {
    expect(tauxEnVigueur(taux, 'sapeur', 'intervention', '2026-12-31')).toBe(1200)
  })

  it("applique le nouveau taux dès le jour de sa date d'effet", () => {
    expect(tauxEnVigueur(taux, 'sapeur', 'intervention', '2027-01-01')).toBe(1300)
  })

  it("renvoie null sans taux pour le couple, ou avant la première date d'effet", () => {
    expect(tauxEnVigueur(taux, 'caporal', 'astreinte', '2026-06-26')).toBeNull()
    expect(tauxEnVigueur(taux, 'sapeur', 'intervention', '2025-12-31')).toBeNull()
  })
})

describe('resoudreTaux (cahier des charges 3.5)', () => {
  const historique: HistoriqueGrade[] = [{ gradeId: 'sapeur', dateEffet: '2025-01-01' }]
  const taux: Taux[] = [
    { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1200, dateEffet: '2026-01-01' },
    { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1300, dateEffet: '2027-01-01' },
  ]

  it("une activité antérieure à la nouvelle date d'effet garde l'ancien taux", () => {
    expect(resoudreTaux(paris('2026-12-15 10:00'), 'intervention', historique, taux)).toBe(1200)
  })

  it("une activité qui commence le jour de la date d'effet prend le nouveau taux", () => {
    expect(resoudreTaux(paris('2027-01-01 10:00'), 'intervention', historique, taux)).toBe(1300)
  })

  it("frontière de fuseau : début le 31/12 à 23:30 (Paris) → ancien taux", () => {
    expect(resoudreTaux(paris('2026-12-31 23:30'), 'intervention', historique, taux)).toBe(1200)
  })

  it("frontière de fuseau, cas miroir : début le 01/01 à 00:30 (Paris, 31/12 à 23:30 UTC) → nouveau taux", () => {
    expect(resoudreTaux(paris('2027-01-01 00:30'), 'intervention', historique, taux)).toBe(1300)
  })

  describe('changement de grade au 01/01/2027', () => {
    const historiqueAvecPromotion: HistoriqueGrade[] = [
      { gradeId: 'sapeur', dateEffet: '2025-01-01' },
      { gradeId: 'caporal', dateEffet: '2027-01-01' },
    ]
    const tauxParGrade: Taux[] = [
      { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1200, dateEffet: '2025-01-01' },
      { gradeId: 'caporal', natureId: 'intervention', centimesParHeure: 1400, dateEffet: '2025-01-01' },
    ]

    it('début le 31/12 à 23:30 (Paris) → ancien grade', () => {
      expect(
        resoudreTaux(paris('2026-12-31 23:30'), 'intervention', historiqueAvecPromotion, tauxParGrade),
      ).toBe(1200)
    })

    it('début le 01/01 à 00:30 (Paris, 31/12 à 23:30 UTC) → nouveau grade', () => {
      expect(
        resoudreTaux(paris('2027-01-01 00:30'), 'intervention', historiqueAvecPromotion, tauxParGrade),
      ).toBe(1400)
    })
  })

  it('renvoie null sans taux pour le couple (grade, nature)', () => {
    expect(resoudreTaux(paris('2026-06-26 08:00'), 'astreinte', historique, taux)).toBeNull()
  })

  it("renvoie null sans grade en vigueur à la date de l'activité", () => {
    expect(resoudreTaux(paris('2024-06-26 08:00'), 'intervention', historique, taux)).toBeNull()
    expect(resoudreTaux(paris('2026-06-26 08:00'), 'intervention', [], taux)).toBeNull()
  })
})
