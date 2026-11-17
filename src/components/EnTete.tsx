import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { useProfil } from '@/hooks/useProfil'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ADRESSES } from '@/routes/adresses'

// En-tête des écrans connectés : nom de l'application, bouton de déconnexion
// et menu de navigation (spécifications des écrans, section 1). L'e-mail de
// l'utilisateur n'est jamais affiché.
//
// Le menu est une rangée de liens toujours visible sous la barre de titre,
// qui passe à la ligne sur un écran étroit (jamais de défilement horizontal) :
// pas de menu déroulant à ouvrir, chaque entrée se touche d'un pouce.
// « Administration » n'apparaît que pour un administrateur (useProfil) ;
// masquer l'entrée n'est qu'un confort, la protection est assurée par la base.
// « Paramètres » est visible pour tout utilisateur connecté.
export function EnTete() {
  const queryClient = useQueryClient()
  const profil = useProfil()
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
    <header className="border-b">
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <Link to={ADRESSES.accueil} className="font-semibold">
          SPV Activités
        </Link>
        <Button variant="outline" size="sm" onClick={seDeconnecter} disabled={envoi}>
          Se déconnecter
        </Button>
      </div>
      <nav aria-label="Menu principal" className="flex flex-wrap gap-1 px-2 pb-2">
        <EntreeMenu to={ADRESSES.accueil}>Accueil</EntreeMenu>
        <EntreeMenu to={ADRESSES.activites}>Activités</EntreeMenu>
        <EntreeMenu to={ADRESSES.astreintes}>Astreintes</EntreeMenu>
        <EntreeMenu to={ADRESSES.parametres}>Paramètres</EntreeMenu>
        {profil.data?.estAdmin && <EntreeMenu to={ADRESSES.admin}>Administration</EntreeMenu>}
      </nav>
    </header>
  )
}

function EntreeMenu({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation()
  // L'entrée de la rubrique affichée est mise en évidence : /activites et
  // /activites/…, /admin et /admin/….
  const active = pathname === to || pathname.startsWith(`${to}/`)
  return (
    <Button asChild variant="ghost" size="sm" className={cn(active && 'bg-muted font-semibold')}>
      <Link to={to} aria-current={active ? 'page' : undefined}>
        {children}
      </Link>
    </Button>
  )
}
