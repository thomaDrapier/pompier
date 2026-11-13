import { describe, expect, it } from 'vitest'
import { calculerMontantCentimes } from './remuneration'

// Tous les taux de ce fichier sont fictifs.

describe('calculerMontantCentimes (cahier des charges 3.5)', () => {
  it('exemple de référence : 3 h 15 à 2,00 €/h → 6,50 € ; 0 h 45 à 12,00 €/h → 9,00 €', () => {
    expect(calculerMontantCentimes(195, 200)).toBe(650)
    expect(calculerMontantCentimes(45, 1200)).toBe(900)
  })

  it('arrondi : 7 min à 12,34 €/h → 144 centimes (1,4397 € arrondi à 1,44 €)', () => {
    expect(calculerMontantCentimes(7, 1234)).toBe(144)
  })

  it('arrondit le demi-centime vers le haut', () => {
    expect(calculerMontantCentimes(1, 30)).toBe(1) // 0,5 centime → 1
    expect(calculerMontantCentimes(1, 90)).toBe(2) // 1,5 centime → 2
  })

  it('arrondit vers le bas sous le demi-centime', () => {
    expect(calculerMontantCentimes(1, 29)).toBe(0) // 0,483 centime → 0
    expect(calculerMontantCentimes(1, 89)).toBe(1) // 1,483 centime → 1
  })

  it('vaut 0 pour une durée nulle (astreinte intégralement consommée)', () => {
    expect(calculerMontantCentimes(0, 200)).toBe(0)
  })

  it('refuse une durée ou un taux non entier ou négatif', () => {
    expect(() => calculerMontantCentimes(1.5, 200)).toThrow('Durée invalide')
    expect(() => calculerMontantCentimes(-1, 200)).toThrow('Durée invalide')
    expect(() => calculerMontantCentimes(60, 12.34)).toThrow('Taux invalide')
    expect(() => calculerMontantCentimes(60, -200)).toThrow('Taux invalide')
  })
})
