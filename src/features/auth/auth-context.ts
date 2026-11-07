import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

// État d'authentification partagé par toute l'application (voir AuthProvider).
export type EtatAuth = {
  // Session Supabase courante, ou null si personne n'est connecté.
  session: Session | null
  // Vrai tant que la session enregistrée n'a pas encore été relue au démarrage.
  chargement: boolean
  // Vrai après un clic sur le lien de réinitialisation reçu par e-mail :
  // l'utilisateur doit choisir un nouveau mot de passe.
  recuperationMotDePasse: boolean
  // À appeler une fois le nouveau mot de passe enregistré.
  terminerRecuperation: () => void
}

export const AuthContext = createContext<EtatAuth | null>(null)
