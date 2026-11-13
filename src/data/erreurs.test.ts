import { describe, expect, it } from 'vitest'
import { ErreurChevauchementAstreintes, ErreurDonnees, traduireErreur } from './erreurs'

describe('traduireErreur', () => {
  it('reconnaît le chevauchement d’astreintes au code ET au message réunis', () => {
    const erreur = traduireErreur({ code: '23P01', message: 'chevauchement_astreintes' })

    expect(erreur).toBeInstanceOf(ErreurChevauchementAstreintes)
    expect(erreur.message).toBe('Cette astreinte chevauche une autre astreinte.')
  })

  it('ne le reconnaît pas avec le bon code mais un autre message', () => {
    const erreur = traduireErreur({ code: '23P01', message: 'autre contrainte' })

    expect(erreur).not.toBeInstanceOf(ErreurChevauchementAstreintes)
    expect(erreur).toBeInstanceOf(ErreurDonnees)
  })

  it('ne le reconnaît pas avec le bon message mais un autre code', () => {
    const erreur = traduireErreur({ code: '42501', message: 'chevauchement_astreintes' })

    expect(erreur).not.toBeInstanceOf(ErreurChevauchementAstreintes)
    expect(erreur).toBeInstanceOf(ErreurDonnees)
  })

  it('conserve le message et le code des autres erreurs', () => {
    const erreur = traduireErreur({ code: '42501', message: 'accès refusé' })

    expect(erreur).toBeInstanceOf(ErreurDonnees)
    expect(erreur.message).toBe('accès refusé')
    expect((erreur as ErreurDonnees).code).toBe('42501')
    expect((traduireErreur({ message: 'réseau' }) as ErreurDonnees).code).toBeNull()
  })
})
