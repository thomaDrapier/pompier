import { useContext } from 'react'
import { AuthContext, type EtatAuth } from '@/features/auth/auth-context'

// Accès à l'état d'authentification depuis n'importe quel composant
// placé sous <AuthProvider>.
export function useAuth(): EtatAuth {
  const etat = useContext(AuthContext)
  if (!etat) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>.')
  }
  return etat
}
