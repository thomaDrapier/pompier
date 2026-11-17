import { describe, expect, it } from 'vitest'
import {
  compter,
  texteActivitesNonComptees,
  texteAstreintesAChevalMois,
  texteDontAnomalies,
} from './textes'

describe('compter', () => {
  it('accorde au singulier et au pluriel', () => {
    expect(compter(0, 'activité')).toBe('0 activités')
    expect(compter(1, 'activité')).toBe('1 activité')
    expect(compter(3, 'activité')).toBe('3 activités')
    expect(compter(2, 'travail', 'travaux')).toBe('2 travaux')
  })
})

describe('texteDontAnomalies (D-034)', () => {
  it('« dont N en anomalie »', () => {
    expect(texteDontAnomalies(1)).toBe('dont 1 en anomalie')
    expect(texteDontAnomalies(2)).toBe('dont 2 en anomalie')
  })
})

describe('texteActivitesNonComptees', () => {
  it('null sans anomalie', () => {
    expect(texteActivitesNonComptees({ taux_manquant: 0, chevauchement_astreintes: 0 })).toBeNull()
  })

  it('singulier, en ne citant que les anomalies présentes', () => {
    expect(texteActivitesNonComptees({ taux_manquant: 1, chevauchement_astreintes: 0 })).toBe(
      '1 activité non comptée : taux manquant (1)',
    )
    expect(texteActivitesNonComptees({ taux_manquant: 0, chevauchement_astreintes: 1 })).toBe(
      '1 activité non comptée : chevauchement d’astreintes (1)',
    )
  })

  it('pluriel', () => {
    expect(texteActivitesNonComptees({ taux_manquant: 2, chevauchement_astreintes: 1 })).toBe(
      '3 activités non comptées : taux manquant (2), chevauchement d’astreintes (1)',
    )
  })
})

describe('texteAstreintesAChevalMois', () => {
  it('null sans astreinte à cheval', () => {
    expect(texteAstreintesAChevalMois(0)).toBeNull()
  })

  it('singulier et pluriel (spécifications 7)', () => {
    expect(texteAstreintesAChevalMois(1)).toBe(
      '1 astreinte à cheval sur deux mois : heures réparties, montant compté sur le mois de début.',
    )
    expect(texteAstreintesAChevalMois(2)).toBe(
      '2 astreintes à cheval sur deux mois : heures réparties, montant compté sur le mois de début.',
    )
  })
})
