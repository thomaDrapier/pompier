import { describe, expect, it } from 'vitest'
import {
  formaterDate,
  formaterDuree,
  formaterHeure,
  formaterMois,
  formaterMontant,
  formaterPlage,
} from './formats'

describe('formaterDate et formaterHeure', () => {
  it('donnent la date abrégée en français et l’heure sur 24 h, à Paris', () => {
    const instant = new Date('2026-06-26T06:00:00Z') // 08:00 à Paris

    expect(formaterDate(instant)).toBe('ven. 26/06/2026')
    expect(formaterHeure(instant)).toBe('08:00')
    expect(formaterHeure(new Date('2026-06-26T18:05:00Z'))).toBe('20:05')
  })

  it('utilisent la date de Paris, pas celle de l’UTC', () => {
    // 31/12 à 23:30 UTC = vendredi 01/01/2027 à 00:30 à Paris.
    const instant = new Date('2026-12-31T23:30:00Z')

    expect(formaterDate(instant)).toBe('ven. 01/01/2027')
    expect(formaterHeure(instant)).toBe('00:30')
  })
})

describe('formaterPlage', () => {
  it('n’affiche la date qu’une fois quand début et fin sont le même jour', () => {
    expect(formaterPlage(new Date('2026-06-26T06:00:00Z'), new Date('2026-06-26T10:00:00Z'))).toBe(
      'ven. 26/06/2026 08:00 – 12:00',
    )
  })

  it('affiche la date de fin quand elle diffère de la date de début', () => {
    expect(formaterPlage(new Date('2026-10-24T18:00:00Z'), new Date('2026-10-25T07:00:00Z'))).toBe(
      'sam. 24/10/2026 20:00 – dim. 25/10/2026 08:00',
    )
  })
})

describe('formaterDuree', () => {
  it('écrit les heures et les minutes sur deux chiffres', () => {
    expect(formaterDuree(195)).toBe('3 h 15')
    expect(formaterDuree(45)).toBe('0 h 45')
    expect(formaterDuree(780)).toBe('13 h 00')
    expect(formaterDuree(0)).toBe('0 h 00')
    expect(formaterDuree(4325)).toBe('72 h 05')
  })
})

describe('formaterMontant', () => {
  it('écrit les centimes avec une virgule et le symbole euro', () => {
    expect(formaterMontant(1550)).toBe('15,50 €')
    expect(formaterMontant(650)).toBe('6,50 €')
    expect(formaterMontant(5)).toBe('0,05 €')
    expect(formaterMontant(0)).toBe('0,00 €')
  })

  it('sépare les milliers par une espace', () => {
    expect(formaterMontant(123405)).toBe('1 234,05 €')
    expect(formaterMontant(100000000)).toBe('1 000 000,00 €')
  })
})

describe('formaterMois', () => {
  it('écrit le mois en toutes lettres', () => {
    expect(formaterMois('2026-06')).toBe('juin 2026')
    expect(formaterMois('2026-12')).toBe('décembre 2026')
    expect(formaterMois('2027-01')).toBe('janvier 2027')
  })
})
