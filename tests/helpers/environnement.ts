// Configuration commune aux tests qui utilisent Supabase local
// (tests/rls/ et tests/e2e/). Exécuté par Node, hors du navigateur.
//
// Garde-fou : ces tests créent et suppriment des comptes. Ils refusent de
// s'exécuter si la base ou l'API visée n'est pas locale (127.0.0.1 / localhost).

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const HOTES_LOCAUX = new Set(['127.0.0.1', 'localhost'])

// URL de la base locale affichée par « npx supabase status » (DB_URL).
// Rôle postgres : réservé à la préparation et au nettoyage des données de
// test (D-008), jamais utilisé pour vérifier les droits.
const URL_BASE_LOCALE_PAR_DEFAUT = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

// Lit les variables de .env.local (format CLE=valeur), sans les exporter.
function lireEnvLocal(): Record<string, string> {
  try {
    const contenu = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    const variables: Record<string, string> = {}
    for (const ligne of contenu.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(ligne)
      if (m) variables[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
    return variables
  } catch {
    return {}
  }
}

function verifierHoteLocal(url: string, nom: string): void {
  const hote = new URL(url).hostname
  if (!HOTES_LOCAUX.has(hote)) {
    throw new Error(
      `${nom} vise l'hôte « ${hote} » : les tests ne s'exécutent que sur Supabase local ` +
        '(127.0.0.1 ou localhost).',
    )
  }
}

export type ConfigSupabaseLocal = {
  // URL de l'API Supabase (VITE_SUPABASE_URL).
  urlApi: string
  // Clé publique (publishable / anon) : la même que celle de l'application.
  clePublique: string
  // URL de connexion directe à PostgreSQL (rôle postgres).
  urlBase: string
}

// Variables lues dans l'environnement du processus, à défaut dans .env.local.
export function configSupabaseLocal(): ConfigSupabaseLocal {
  const envLocal = lireEnvLocal()
  const urlApi = process.env.VITE_SUPABASE_URL ?? envLocal.VITE_SUPABASE_URL
  const clePublique = process.env.VITE_SUPABASE_ANON_KEY ?? envLocal.VITE_SUPABASE_ANON_KEY
  const urlBase = process.env.SUPABASE_DB_URL ?? URL_BASE_LOCALE_PAR_DEFAUT

  if (!urlApi || !clePublique) {
    throw new Error(
      'VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requises (.env.local, voir .env.example).',
    )
  }
  verifierHoteLocal(urlApi, 'VITE_SUPABASE_URL')
  verifierHoteLocal(urlBase, 'SUPABASE_DB_URL')

  return { urlApi, clePublique, urlBase }
}
