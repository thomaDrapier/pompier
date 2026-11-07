// Comptes FICTIFS pour les tests (adresses @example.test, domaine réservé aux
// tests : aucune donnée personnelle réelle).
//
// Création : par supabase.auth.signUp avec la clé publique, exactement comme le
// ferait un utilisateur. Suppression : directement dans auth.users avec le rôle
// postgres (la suppression d'un compte supprime en cascade son profil, ses
// activités et son historique de grade).

import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import pg from 'pg'
import type { Database } from '../../src/types/database.ts'
import { configSupabaseLocal } from './environnement.ts'

export type ClientTest = SupabaseClient<Database>

export type CompteTest = {
  id: string
  email: string
  motDePasse: string
  // Client connecté avec ce compte.
  client: ClientTest
}

// Client Supabase sans persistance de session (Node, aucun stockage navigateur).
export function nouveauClient(): ClientTest {
  const { urlApi, clePublique } = configSupabaseLocal()
  return createClient<Database>(urlApi, clePublique, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

// Crée un compte fictif et renvoie un client connecté avec ce compte.
// Les confirmations d'e-mail sont désactivées en local : signUp ouvre la session.
export async function creerCompte(prefixe: string): Promise<CompteTest> {
  const email = `${prefixe}-${randomUUID()}@example.test`
  const motDePasse = `Test-${randomUUID()}`
  const client = nouveauClient()
  const { data, error } = await client.auth.signUp({ email, password: motDePasse })
  if (error || !data.user || !data.session) {
    throw new Error(`Création du compte de test impossible : ${error?.message ?? 'pas de session'}`)
  }
  return { id: data.user.id, email, motDePasse, client }
}

// Connexion directe à PostgreSQL (rôle postgres) pour préparer et nettoyer les
// données de test. Ne sert JAMAIS à vérifier les droits.
export async function connexionBase(): Promise<pg.Client> {
  const base = new pg.Client({ connectionString: configSupabaseLocal().urlBase })
  await base.connect()
  return base
}

// Supprime les comptes de test (et, en cascade, toutes leurs données).
// Sécurité supplémentaire : ne touche qu'aux adresses @example.test.
export async function supprimerComptes(base: pg.Client, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await base.query(
    `delete from auth.users where id = any($1::uuid[]) and email like '%@example.test'`,
    [ids],
  )
}
