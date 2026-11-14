// Aides communes aux tests de parcours.

import { expect, type Page } from '@playwright/test'
import { connexionBase, creerCompte, supprimerComptes, type CompteTest } from '../helpers/comptes.ts'

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
