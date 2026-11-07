/// <reference types="vite/client" />

// Variables d'environnement exposées au client (préfixe VITE_), lues dans .env.local.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
