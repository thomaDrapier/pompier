// Parcours d'authentification (J0 · étape 0.4), sur ordinateur et smartphone.
// Le compte fictif est créé par global-setup.ts.

import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

function compte(): { email: string; motDePasse: string } {
  const email = process.env.E2E_EMAIL
  const motDePasse = process.env.E2E_MOT_DE_PASSE
  if (!email || !motDePasse) throw new Error('Compte de test absent (global-setup.ts).')
  return { email, motDePasse }
}

async function seConnecter(page: Page, email: string, motDePasse: string): Promise<void> {
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Mot de passe').fill(motDePasse)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('l’écran de connexion s’affiche', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Mot de passe')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mot de passe oublié' })).toBeVisible()
})

test('de mauvais identifiants affichent « Identifiants incorrects »', async ({ page }) => {
  await seConnecter(page, compte().email, 'mauvais-mot-de-passe')
  await expect(page.getByRole('alert')).toHaveText('Identifiants incorrects')
})

test('une connexion réussie affiche l’e-mail de l’utilisateur', async ({ page }) => {
  const { email, motDePasse } = compte()
  await seConnecter(page, email, motDePasse)
  await expect(page.getByText(`Connecté : ${email}`)).toBeVisible()
})

test('la session est conservée après rechargement de la page', async ({ page }) => {
  const { email, motDePasse } = compte()
  await seConnecter(page, email, motDePasse)
  await expect(page.getByText(`Connecté : ${email}`)).toBeVisible()

  await page.reload()

  await expect(page.getByText(`Connecté : ${email}`)).toBeVisible()
})

test('la déconnexion ramène à l’écran de connexion', async ({ page }) => {
  const { email, motDePasse } = compte()
  await seConnecter(page, email, motDePasse)
  await expect(page.getByText(`Connecté : ${email}`)).toBeVisible()

  await page.getByRole('button', { name: 'Se déconnecter' }).click()

  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  // Après rechargement, toujours déconnecté (session supprimée du navigateur).
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
})

test('« Mot de passe oublié » affiche un message neutre', async ({ page }) => {
  await page.getByRole('button', { name: 'Mot de passe oublié' }).click()
  await expect(page.getByRole('heading', { name: 'Mot de passe oublié' })).toBeVisible()

  // Adresse sans compte : le message doit être le même que pour un compte existant.
  await page.getByLabel('E-mail').fill(`inconnu-${randomUUID()}@example.test`)
  await page.getByRole('button', { name: 'Envoyer le lien' }).click()

  await expect(page.getByText('Si un compte existe, un e-mail a été envoyé')).toBeVisible()
})
