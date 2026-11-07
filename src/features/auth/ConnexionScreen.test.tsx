import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnexionScreen } from '@/features/auth/ConnexionScreen'

// Client Supabase simulé : aucun appel réseau dans les tests unitaires.
const { signInWithPassword } = vi.hoisted(() => ({ signInWithPassword: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword } },
}))

describe('ConnexionScreen', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
  })

  it('affiche les champs e-mail et mot de passe, le bouton et le lien « Mot de passe oublié »', () => {
    render(<ConnexionScreen onMotDePasseOublie={() => {}} />)

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mot de passe oublié' })).toBeInTheDocument()
  })

  it('affiche « Identifiants incorrects » quand la connexion échoue', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', message: 'Invalid login credentials', status: 400 },
    })
    const utilisateur = userEvent.setup()
    render(<ConnexionScreen onMotDePasseOublie={() => {}} />)

    await utilisateur.type(screen.getByLabelText('E-mail'), 'inconnu@example.test')
    await utilisateur.type(screen.getByLabelText('Mot de passe'), 'mauvais-mot-de-passe')
    await utilisateur.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants incorrects')
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'inconnu@example.test',
      password: 'mauvais-mot-de-passe',
    })
  })

  it('appelle onMotDePasseOublie au clic sur le lien', async () => {
    const onMotDePasseOublie = vi.fn()
    const utilisateur = userEvent.setup()
    render(<ConnexionScreen onMotDePasseOublie={onMotDePasseOublie} />)

    await utilisateur.click(screen.getByRole('button', { name: 'Mot de passe oublié' }))

    expect(onMotDePasseOublie).toHaveBeenCalledOnce()
  })
})
