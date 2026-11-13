import { describe, expect, it } from 'vitest'
import {
  tauxEnCentimes,
  versActivite,
  versHistoriqueGrade,
  versNature,
  versTaux,
} from './conversions'

// Tous les taux de ce fichier sont fictifs.

describe('tauxEnCentimes', () => {
  it('convertit des euros en centimes entiers', () => {
    expect(tauxEnCentimes(2)).toBe(200)
    expect(tauxEnCentimes(12.5)).toBe(1250)
    expect(tauxEnCentimes(0)).toBe(0)
  })

  it('12,34 € → 1234 centimes', () => {
    expect(tauxEnCentimes(12.34)).toBe(1234)
  })

  it('1,15 € → 115 centimes malgré l’imprécision des nombres à virgule', () => {
    // En JavaScript, 1.15 * 100 vaut 114.99999999999999 : sans tolérance, ce
    // taux serait refusé comme ayant plus de 2 décimales.
    expect(1.15 * 100).not.toBe(115)
    expect(tauxEnCentimes(1.15)).toBe(115)
  })

  it('0,1 + 0,2 → 30 centimes', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(tauxEnCentimes(0.1 + 0.2)).toBe(30)
  })

  it('refuse un taux à plus de 2 décimales', () => {
    expect(() => tauxEnCentimes(12.345)).toThrow('plus de 2 décimales')
    expect(() => tauxEnCentimes(0.001)).toThrow('plus de 2 décimales')
  })

  it('refuse un taux négatif ou non numérique', () => {
    expect(() => tauxEnCentimes(-1)).toThrow('Taux horaire invalide')
    expect(() => tauxEnCentimes(Number.NaN)).toThrow('Taux horaire invalide')
    expect(() => tauxEnCentimes(Number.POSITIVE_INFINITY)).toThrow('Taux horaire invalide')
  })
})

describe('versNature', () => {
  it('garde l’identifiant et l’indicateur d’astreinte', () => {
    expect(
      versNature({ id: 'n1', code: 'AST', libelle: 'Astreinte', est_astreinte: true, actif: true, ordre: 1 }),
    ).toEqual({ id: 'n1', estAstreinte: true })
  })
})

describe('versActivite', () => {
  it('convertit les instants en Date, quel que soit le décalage écrit dans le texte', () => {
    const activite = versActivite({
      id: 'a1',
      user_id: 'u1',
      activity_type_id: 'n1',
      debut: '2026-06-26T08:00:00+02:00',
      fin: '2026-06-26T10:00:00+00:00',
      note: null,
      cree_le: '2026-06-26T12:00:00+00:00',
      modifie_le: '2026-06-26T12:00:00+00:00',
    })

    expect(activite).toEqual({
      id: 'a1',
      natureId: 'n1',
      debut: new Date('2026-06-26T06:00:00Z'),
      fin: new Date('2026-06-26T10:00:00Z'),
    })
  })
})

describe('versHistoriqueGrade', () => {
  it('conserve la date d’effet au format AAAA-MM-JJ', () => {
    expect(
      versHistoriqueGrade({ id: 'h1', user_id: 'u1', grade_id: 'g1', date_effet: '2026-07-01' }),
    ).toEqual({ gradeId: 'g1', dateEffet: '2026-07-01' })
  })
})

describe('versTaux', () => {
  it('convertit le taux en centimes et conserve la date d’effet', () => {
    expect(
      versTaux({
        id: 't1',
        grade_id: 'g1',
        activity_type_id: 'n1',
        taux_horaire: 12.34,
        date_effet: '2026-01-01',
      }),
    ).toEqual({ gradeId: 'g1', natureId: 'n1', centimesParHeure: 1234, dateEffet: '2026-01-01' })
  })
})
