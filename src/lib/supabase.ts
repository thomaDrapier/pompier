import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Client Supabase unique de l'application, typé à partir du schéma de la base
// (src/types/database.ts, généré par « npx supabase gen types typescript --local »).
//
// Sécurité : seules l'URL et la clé PUBLIQUE (publishable / anon) sont utilisées.
// Elles sont lisibles par n'importe quel visiteur : la protection des données
// repose sur la Row Level Security de la base. La clé secrète de Supabase
// (accès administrateur, contourne la RLS) n'est JAMAIS utilisée côté client.

const url = import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !cle) {
  throw new Error(
    'Configuration Supabase absente : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ' +
      'doivent être définies dans .env.local (voir .env.example).',
  )
}

export const supabase = createClient<Database>(url, cle, {
  auth: {
    // Session conservée dans le stockage du navigateur : l'utilisateur reste
    // connecté après un rechargement ou une réouverture de la PWA.
    persistSession: true,
    // Le jeton d'accès (durée courte) est renouvelé automatiquement.
    autoRefreshToken: true,
    // Lit la session présente dans l'URL au retour d'un lien reçu par e-mail
    // (réinitialisation du mot de passe).
    detectSessionInUrl: true,
  },
})
