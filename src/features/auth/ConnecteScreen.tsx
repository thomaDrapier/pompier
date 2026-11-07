import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

// Écran connecté TEMPORAIRE (J0) : aucune interface métier à ce stade.
export function ConnecteScreen({ email }: { email: string | undefined }) {
  const [envoi, setEnvoi] = useState(false)

  async function seDeconnecter() {
    setEnvoi(true)
    // scope « local » : ferme la session de CET appareil uniquement ; les
    // autres appareils de l'utilisateur restent connectés.
    await supabase.auth.signOut({ scope: 'local' })
    setEnvoi(false)
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-2xl font-semibold">SPV Activités — en construction</h1>
      <p>
        Connecté : <span className="font-medium break-all">{email}</span>
      </p>
      <Button size="lg" variant="outline" onClick={seDeconnecter} disabled={envoi}>
        Se déconnecter
      </Button>
    </main>
  )
}
