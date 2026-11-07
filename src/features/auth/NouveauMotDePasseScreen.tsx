import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { EcranAuth } from '@/features/auth/EcranAuth'
import { useAuth } from '@/features/auth/useAuth'

// Longueur minimale imposée côté interface ; la même valeur est configurée
// côté serveur (supabase/config.toml, minimum_password_length).
const LONGUEUR_MIN_MOT_DE_PASSE = 8

// Affiché après un clic sur le lien de réinitialisation reçu par e-mail :
// l'utilisateur est alors connecté par ce lien et choisit un nouveau mot de passe.
export function NouveauMotDePasseScreen() {
  const { terminerRecuperation } = useAuth()
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function enregistrer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErreur(null)
    if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
      setErreur(`Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`)
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne sont pas identiques.')
      return
    }
    setEnvoi(true)
    const { error } = await supabase.auth.updateUser({ password: motDePasse })
    setEnvoi(false)
    if (error) {
      setErreur('Le mot de passe n’a pas pu être enregistré. Réessayez ou demandez un nouveau lien.')
      return
    }
    // Retour à l'écran connecté.
    terminerRecuperation()
  }

  return (
    <EcranAuth titre="Nouveau mot de passe" description="Choisissez votre nouveau mot de passe.">
      <form onSubmit={enregistrer} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nouveau-mot-de-passe">Nouveau mot de passe</Label>
          <Input
            id="nouveau-mot-de-passe"
            type="password"
            autoComplete="new-password"
            minLength={LONGUEUR_MIN_MOT_DE_PASSE}
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmation-mot-de-passe">Confirmation</Label>
          <Input
            id="confirmation-mot-de-passe"
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
        {erreur && (
          <p role="alert" className="text-sm text-destructive">
            {erreur}
          </p>
        )}
        <Button type="submit" size="lg" disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>
    </EcranAuth>
  )
}
