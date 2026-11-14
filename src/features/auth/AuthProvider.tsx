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

// La récupération en cours est aussi notée dans le stockage du navigateur, avec
// l'identifiant du compte : sans cela, un simple rechargement de la page (ou
// un autre onglet) ferait oublier qu'un nouveau mot de passe doit être choisi,
// et la session ouverte par le lien donnerait accès aux activités.
// La note est effacée dès que le mot de passe est enregistré, à la
// déconnexion, ou lors d'une connexion normale par mot de passe.
const CLE_RECUPERATION = 'spv.recuperation-mot-de-passe'

function lireRecuperationNotee(): string | null {
  try {
    return window.localStorage.getItem(CLE_RECUPERATION)
  } catch {
    return null
  }
}

function noterRecuperation(userId: string | null): void {
  try {
    if (userId === null) window.localStorage.removeItem(CLE_RECUPERATION)
    else window.localStorage.setItem(CLE_RECUPERATION, userId)
  } catch {
    // Stockage indisponible (navigation privée stricte) : la récupération
    // reste suivie en mémoire, pour la durée de la page.
  }
}

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
      const userId = data.session?.user.id ?? null
      if (arriveeParLienDeRecuperation && userId !== null) {
        noterRecuperation(userId)
      } else if (userId !== null && lireRecuperationNotee() === userId) {
        // Page rechargée pendant une récupération : elle n'est pas terminée.
        setRecuperationMotDePasse(true)
      } else if (!arriveeParLienDeRecuperation) {
        // Pas de session, ou note laissée par un autre compte : sans objet.
        noterRecuperation(null)
      }
    })

    // Ne jamais appeler d'autre méthode Supabase (avec await) dans ce rappel :
    // la bibliothèque le déconseille (risque de blocage).
    const { data } = supabase.auth.onAuthStateChange((evenement, nouvelleSession) => {
      if (!actif) return
      setSession(nouvelleSession)
      setChargement(false)
      if (evenement === 'PASSWORD_RECOVERY') {
        setRecuperationMotDePasse(true)
        noterRecuperation(nouvelleSession?.user.id ?? null)
      }
      if (evenement === 'SIGNED_OUT') {
        setRecuperationMotDePasse(false)
        noterRecuperation(null)
      }
      // Connexion normale par mot de passe (et non par le lien) : une
      // récupération restée en suspens n'a plus lieu d'être.
      if (evenement === 'SIGNED_IN' && !arriveeParLienDeRecuperation) {
        const noteePour = lireRecuperationNotee()
        if (noteePour !== null && noteePour !== nouvelleSession?.user.id) noterRecuperation(null)
      }
    })

    return () => {
      actif = false
      data.subscription.unsubscribe()
    }
  }, [])

  const terminerRecuperation = useCallback(() => {
    setRecuperationMotDePasse(false)
    noterRecuperation(null)
  }, [])

  const valeur = useMemo<EtatAuth>(
    () => ({ session, chargement, recuperationMotDePasse, terminerRecuperation }),
    [session, chargement, recuperationMotDePasse, terminerRecuperation],
  )

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>
}
