import { useState } from 'react'
import { OfflineBanner } from '@/components/OfflineBanner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { ConnexionScreen } from '@/features/auth/ConnexionScreen'
import { MotDePasseOublieScreen } from '@/features/auth/MotDePasseOublieScreen'
import { NouveauMotDePasseScreen } from '@/features/auth/NouveauMotDePasseScreen'
import { ConnecteScreen } from '@/features/auth/ConnecteScreen'

// Choix de l'écran selon l'état d'authentification. Pas de routeur pour
// l'instant (choix reporté avant les écrans du J1).
function Ecrans() {
  const { session, chargement, recuperationMotDePasse } = useAuth()
  const [oubli, setOubli] = useState(false)

  if (chargement) {
    return (
      <main className="flex min-h-svh items-center justify-center p-4">
        <p role="status" className="text-muted-foreground">
          Chargement…
        </p>
      </main>
    )
  }

  // Retour par le lien de réinitialisation : le lien a ouvert une session,
  // l'utilisateur doit d'abord choisir un nouveau mot de passe.
  if (session && recuperationMotDePasse) return <NouveauMotDePasseScreen />

  if (session) return <ConnecteScreen email={session.user.email} />

  if (oubli) return <MotDePasseOublieScreen onRetour={() => setOubli(false)} />

  return <ConnexionScreen onMotDePasseOublie={() => setOubli(true)} />
}

function App() {
  return (
    <AuthProvider>
      <OfflineBanner />
      <Ecrans />
    </AuthProvider>
  )
}

export default App
