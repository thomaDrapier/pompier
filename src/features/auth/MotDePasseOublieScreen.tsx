import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { EcranAuth } from '@/features/auth/EcranAuth'

// Demande de réinitialisation du mot de passe : Supabase envoie un e-mail
// contenant un lien qui ramène sur l'application (redirectTo), où l'écran
// « Nouveau mot de passe » s'affiche.
// Sécurité : le message de confirmation est neutre, qu'un compte existe ou non.
export function MotDePasseOublieScreen({ onRetour }: { onRetour: () => void }) {
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [envoi, setEnvoi] = useState(false)

  async function demanderLien(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnvoi(true)
    // Le résultat n'est volontairement pas exploité : afficher une erreur
    // permettrait de deviner si l'adresse correspond à un compte.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setEnvoi(false)
    setEnvoye(true)
  }

  return (
    <EcranAuth
      titre="Mot de passe oublié"
      description="Saisissez votre e-mail pour recevoir un lien de réinitialisation."
    >
      {envoye ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="text-sm">
            Si un compte existe, un e-mail a été envoyé
          </p>
          <Button type="button" variant="outline" onClick={onRetour}>
            Retour à la connexion
          </Button>
        </div>
      ) : (
        <form onSubmit={demanderLien} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-oubli">E-mail</Label>
            <Input
              id="email-oubli"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" disabled={envoi || !email}>
            {envoi ? 'Envoi…' : 'Envoyer le lien'}
          </Button>
          <Button type="button" variant="link" onClick={onRetour}>
            Retour à la connexion
          </Button>
        </form>
      )}
    </EcranAuth>
  )
}
