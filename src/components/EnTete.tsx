import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { ADRESSES } from '@/routes/adresses'

// En-tête des écrans connectés : nom de l'application et bouton de
// déconnexion. L'e-mail de l'utilisateur n'est pas affiché (spécifications
// des écrans, section 1).
export function EnTete() {
  const queryClient = useQueryClient()
  const [envoi, setEnvoi] = useState(false)

  async function seDeconnecter() {
    setEnvoi(true)
    // scope « local » : ferme la session de CET appareil uniquement ; les
    // autres appareils de l'utilisateur restent connectés.
    await supabase.auth.signOut({ scope: 'local' })
    // Les données lues ne doivent pas rester en mémoire pour le compte suivant.
    queryClient.clear()
    setEnvoi(false)
  }

  return (
    <header className="flex items-center justify-between gap-2 border-b px-4 py-2">
      <Link to={ADRESSES.activites} className="font-semibold">
        SPV Activités
      </Link>
      <Button variant="outline" size="sm" onClick={seDeconnecter} disabled={envoi}>
        Se déconnecter
      </Button>
    </header>
  )
}
