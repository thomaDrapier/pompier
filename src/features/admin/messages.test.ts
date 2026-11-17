import { describe, expect, it } from 'vitest'
import {
  ErreurAstreinteEtIntervention,
  ErreurAstreinteVerrouillee,
  ErreurDejaServi,
  ErreurDonnees,
  ErreurDoublon,
  ErreurTauxNegatif,
} from '@/data/erreurs'
import { MESSAGES, messageDateEffetPassee, messageErreur } from './messages'

describe('messageErreur', () => {
  it('« déjà servi » : message propre au grade ou à la nature (spécifications 6.2, 6.3)', () => {
    expect(messageErreur(new ErreurDejaServi(), 'grade')).toBe(
      'Ce grade a déjà servi : archivez-le plutôt.',
    )
    expect(messageErreur(new ErreurDejaServi(), 'nature')).toBe(
      'Cette nature a déjà servi : archivez-la plutôt.',
    )
  })

  it('doublons : messages des spécifications', () => {
    expect(messageErreur(new ErreurDoublon('libelle_grade'))).toBe('Un grade porte déjà ce libellé.')
    expect(messageErreur(new ErreurDoublon('code_nature'))).toBe('Une nature porte déjà ce code.')
    expect(messageErreur(new ErreurDoublon('taux'))).toBe(
      'Un taux existe déjà pour ce grade, cette nature et cette date d’effet.',
    )
  })

  it('verrou de « est une astreinte » : explication de D-022', () => {
    expect(messageErreur(new ErreurAstreinteVerrouillee())).toBe(MESSAGES.astreinteVerrouillee)
  })

  it('taux négatif refusé par la base', () => {
    expect(messageErreur(new ErreurTauxNegatif())).toBe('Le taux doit être positif ou nul.')
  })

  it('toute autre erreur : message générique (réseau ou serveur)', () => {
    expect(messageErreur(new ErreurDonnees('Failed to fetch'))).toBe(MESSAGES.erreurServeur)
    expect(messageErreur(new Error('?'))).toBe(MESSAGES.erreurServeur)
  })
})

describe('messageDateEffetPassee (D-020)', () => {
  it('cite la date d’effet au format JJ/MM/AAAA', () => {
    expect(messageDateEffetPassee('2026-01-01')).toBe(
      'Cette date d’effet est passée : les montants des activités à partir du 01/01/2026 seront recalculés.',
    )
  })
})

describe('messageErreur : astreinte et intervention (D-032)', () => {
  it('message de la spécification 6.3', () => {
    expect(messageErreur(new ErreurAstreinteEtIntervention())).toBe(
      'Une nature ne peut pas être à la fois une astreinte et une intervention.',
    )
  })
})
