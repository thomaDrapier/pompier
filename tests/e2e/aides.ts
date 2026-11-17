// Aides communes aux tests de parcours.

import { expect, type Page } from '@playwright/test'
import type pg from 'pg'
import { connexionBase, creerCompte, supprimerComptes, type CompteTest } from '../helpers/comptes.ts'

/**
 * Exécute une requête SQL avec le rôle postgres, pour préparer ou nettoyer
 * les données d'un test (D-008). Ne sert jamais à vérifier les droits.
 */
export async function requeteSql<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  parametres: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  const base = await connexionBase()
  try {
    return await base.query<T>(sql, parametres)
  } finally {
    await base.end()
  }
}

/** Crée un compte fictif propre à un test et le promeut administrateur (rôle postgres, D-008). */
export async function creerCompteAdmin(prefixe: string): Promise<CompteTest> {
  const compte = await creerCompte(prefixe)
  await requeteSql(`update public.profiles set role = 'admin' where id = $1`, [compte.id])
  return compte
}

/**
 * Supprime le référentiel fictif d'un test : taux, natures et grades dont le
 * libellé ou le code contient le suffixe unique du test. À appeler APRÈS la
 * suppression des comptes (leurs activités et historiques utilisent ces lignes).
 */
export async function nettoyerReferentiel(suffixe: string): Promise<void> {
  const motif = `%${suffixe}%`
  await requeteSql(
    `delete from public.reference_rates r
     using public.grades g, public.activity_types t
     where r.grade_id = g.id and r.activity_type_id = t.id
       and (g.libelle ilike $1 or t.libelle ilike $1 or t.code ilike $1)`,
    [motif],
  )
  await requeteSql(
    `delete from public.activity_types where libelle ilike $1 or code ilike $1`,
    [motif],
  )
  await requeteSql(`delete from public.grades where libelle ilike $1`, [motif])
}

/** Date du jour à Paris, au format AAAA-MM-JJ (valeur d'un champ date). */
export function dateDuJourParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

/** « 2026-11-17 » → « 17/11/2026 » */
export function jourFrancais(date: string): string {
  const [annee, mois, jour] = date.split('-')
  return `${jour}/${mois}/${annee}`
}

/** Remplit l'écran de connexion et valide. */
export async function seConnecter(page: Page, email: string, motDePasse: string): Promise<void> {
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Mot de passe').fill(motDePasse)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

/**
 * Crée un compte fictif propre à un test et lui attribue le grade « Sapeur »
 * du seed depuis le 01/01/2025 : ses activités ont ainsi un taux (fictif).
 * Prérequis : le seed est présent (npx supabase db reset).
 */
export async function creerCompteAvecGrade(prefixe: string): Promise<CompteTest> {
  const compte = await creerCompte(prefixe)
  const base = await connexionBase()
  try {
    const resultat = await base.query(
      `insert into public.user_grade_history (user_id, grade_id, date_effet)
       select $1, g.id, date '2025-01-01' from public.grades g where g.libelle = 'Sapeur'`,
      [compte.id],
    )
    if (resultat.rowCount !== 1) {
      throw new Error('Grade « Sapeur » introuvable : lancer « npx supabase db reset » (seed).')
    }
  } finally {
    await base.end()
  }
  return compte
}

export async function supprimerCompte(compte: CompteTest | undefined): Promise<void> {
  if (!compte) return
  const base = await connexionBase()
  try {
    await supprimerComptes(base, [compte.id])
  } finally {
    await base.end()
  }
}

export interface SaisieTest {
  nature: string
  dateDebut: string
  heureDebut: string
  /** Laisser vide pour garder la date de fin proposée par le formulaire. */
  dateFin?: string
  heureFin: string
}

/** Remplit le formulaire d'activité (sans l'enregistrer). */
export async function remplirActivite(page: Page, saisie: SaisieTest): Promise<void> {
  await page.getByLabel('Nature').selectOption({ label: saisie.nature })
  await page.getByLabel('Date de début').fill(saisie.dateDebut)
  await page.getByLabel('Heure de début').fill(saisie.heureDebut)
  await page.getByLabel('Heure de fin').fill(saisie.heureFin)
  if (saisie.dateFin) await page.getByLabel('Date de fin').fill(saisie.dateFin)
}

/** Depuis la liste : ouvre le formulaire, saisit une activité et l'enregistre. */
export async function saisirActivite(page: Page, saisie: SaisieTest): Promise<void> {
  await page.getByRole('link', { name: 'Nouvelle activité' }).click()
  await expect(page.getByRole('heading', { name: 'Nouvelle activité' })).toBeVisible()
  await remplirActivite(page, saisie)
  await page.getByRole('button', { name: 'Enregistrer' }).click()
}

/** Les lignes de la liste des activités du mois affiché. */
export function lignesActivites(page: Page) {
  return page.getByRole('list', { name: 'Activités du mois' }).getByRole('link')
}
