import { useState, type FormEvent } from 'react'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { EcranAuth } from '@/features/auth/EcranAuth'

// Écran de connexion : e-mail + mot de passe.
// Sécurité : en cas d'échec, message générique qui ne révèle pas si le compte
// existe. Aucune inscription publique (création des comptes : point ouvert,
// cahier des charges section 11).
export function ConnexionScreen({ onMotDePasseOublie }: { onMotDePasseOublie: () => void }) {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function seConnecter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErreur(null)
    setEnvoi(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    setEnvoi(false)
    if (error) {
      // Seule une panne réseau a un message propre ; tout le reste (compte
      // inconnu, mauvais mot de passe, compte non confirmé…) reste générique.
      setErreur(
        isAuthRetryableFetchError(error)
          ? 'Serveur injoignable. Vérifiez votre connexion et réessayez.'
          : 'Identifiants incorrects',
      )
    }
    // En cas de succès, AuthProvider reçoit la nouvelle session et App affiche
    // l'écran connecté : rien d'autre à faire ici.
  }

  return (
    <EcranAuth titre="Connexion" description="SPV Activités">
      <form onSubmit={seConnecter} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="mot-de-passe">Mot de passe</Label>
          <Input
            id="mot-de-passe"
            type="password"
            autoComplete="current-password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </div>
        {erreur && (
          <p role="alert" className="text-sm text-destructive">
            {erreur}
          </p>
        )}
        <Button type="submit" size="lg" disabled={envoi || !email || !motDePasse}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </Button>
        <Button type="button" variant="link" onClick={onMotDePasseOublie}>
          Mot de passe oublié
        </Button>
      </form>
    </EcranAuth>
  )
}
