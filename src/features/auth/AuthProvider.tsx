import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthContext, type EtatAuth } from '@/features/auth/auth-context'

// Le lien de réinitialisation reçu par e-mail ramène sur l'application avec
// « type=recovery » dans l'URL (après le #). On le relève dès le chargement du
// module, avant que le client Supabase ne nettoie l'URL : c'est une sécurité en
// plus de l'événement PASSWORD_RECOVERY ci-dessous.
const arriveeParLienDeRecuperation =
  typeof window !== 'undefined' && /(^|[#&])type=recovery(&|$)/.test(window.location.hash)

// Fournit la session courante à toute l'application :
// - au démarrage, relit la session enregistrée (getSession) ;
// - ensuite, suit chaque changement (connexion, déconnexion, renouvellement du
//   jeton, retour par le lien de réinitialisation) via onAuthStateChange.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [chargement, setChargement] = useState(true)
  const [recuperationMotDePasse, setRecuperationMotDePasse] = useState(
    arriveeParLienDeRecuperation,
  )

  useEffect(() => {
    let actif = true

    supabase.auth.getSession().then(({ data }) => {
      if (!actif) return
      setSession(data.session)
      setChargement(false)
    })

    // Ne jamais appeler d'autre méthode Supabase (avec await) dans ce rappel :
    // la bibliothèque le déconseille (risque de blocage).
    const { data } = supabase.auth.onAuthStateChange((evenement, nouvelleSession) => {
      if (!actif) return
      setSession(nouvelleSession)
      setChargement(false)
      if (evenement === 'PASSWORD_RECOVERY') setRecuperationMotDePasse(true)
      if (evenement === 'SIGNED_OUT') setRecuperationMotDePasse(false)
    })

    return () => {
      actif = false
      data.subscription.unsubscribe()
    }
  }, [])

  const terminerRecuperation = useCallback(() => setRecuperationMotDePasse(false), [])

  const valeur = useMemo<EtatAuth>(
    () => ({ session, chargement, recuperationMotDePasse, terminerRecuperation }),
    [session, chargement, recuperationMotDePasse, terminerRecuperation],
  )

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>
}
