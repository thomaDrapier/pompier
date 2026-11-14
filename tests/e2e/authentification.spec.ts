// Parcours d'authentification (J0 · étape 0.4, adaptés aux adresses du J1),
// sur ordinateur et smartphone.
// Le compte fictif partagé est créé par global-setup.ts ; le parcours de
// réinitialisation crée le sien, car il change le mot de passe.

import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { creerCompte } from '../helpers/comptes.ts'
import { seConnecter, supprimerCompte } from './aides.ts'

// Boîte mail de test de Supabase local (reçoit les e-mails de réinitialisation).
const URL_MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324'

function compte(): { email: string; motDePasse: string } {
  const email = process.env.E2E_EMAIL
  const motDePasse = process.env.E2E_MOT_DE_PASSE
  if (!email || !motDePasse) throw new Error('Compte de test absent (global-setup.ts).')
  return { email, motDePasse }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('la racine du site renvoie un visiteur vers l’écran de connexion', async ({ page }) => {
  await expect(page).toHaveURL(/\/connexion$/)
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

test('une connexion réussie affiche la liste des activités, sans l’e-mail', async ({ page }) => {
  const { email, motDePasse } = compte()
  await seConnecter(page, email, motDePasse)

  await expect(page).toHaveURL(/\/activites$/)
  await expect(page.getByRole('heading', { name: 'Activités', exact: true })).toBeVisible()
  await expect(page.getByText(email)).toHaveCount(0)
})

test('la session est conservée après rechargement de la page', async ({ page }) => {
  const { email, motDePasse } = compte()
  await seConnecter(page, email, motDePasse)
  await expect(page.getByRole('heading', { name: 'Activités', exact: true })).toBeVisible()

  await page.reload()

  await expect(page.getByRole('heading', { name: 'Activités', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/activites$/)
})

test('la déconnexion ramène à l’écran de connexion', async ({ page }) => {
  const { email, motDePasse } = compte()
  await seConnecter(page, email, motDePasse)
  await expect(page.getByRole('heading', { name: 'Activités', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Se déconnecter' }).click()

  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  // Après rechargement, toujours déconnecté (session supprimée du navigateur).
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
})

test('f) une adresse protégée renvoie vers la connexion, puis y ramène après connexion', async ({
  page,
}) => {
  const { email, motDePasse } = compte()
  await page.goto('/activites?mois=2026-06')

  await expect(page).toHaveURL(/\/connexion$/)
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()

  await seConnecter(page, email, motDePasse)

  await expect(page).toHaveURL(/\/activites\?mois=2026-06$/)
  await expect(page.getByRole('heading', { name: 'juin 2026' })).toBeVisible()
})

test('le formulaire de saisie est lui aussi protégé', async ({ page }) => {
  await page.goto('/activites/nouvelle')

  await expect(page).toHaveURL(/\/connexion$/)
})

test('« Mot de passe oublié » a sa propre adresse et affiche un message neutre', async ({ page }) => {
  await page.getByRole('button', { name: 'Mot de passe oublié' }).click()
  await expect(page).toHaveURL(/\/mot-de-passe-oublie$/)
  await expect(page.getByRole('heading', { name: 'Mot de passe oublié' })).toBeVisible()

  // Adresse sans compte : le message doit être le même que pour un compte existant.
  await page.getByLabel('E-mail').fill(`inconnu-${randomUUID()}@example.test`)
  await page.getByRole('button', { name: 'Envoyer le lien' }).click()

  await expect(page.getByText('Si un compte existe, un e-mail a été envoyé')).toBeVisible()

  await page.getByRole('button', { name: 'Retour à la connexion' }).click()
  await expect(page).toHaveURL(/\/connexion$/)
})

test('« Nouveau mot de passe » est inaccessible sans lien de réinitialisation', async ({ page }) => {
  await page.goto('/nouveau-mot-de-passe')
  await expect(page).toHaveURL(/\/connexion$/)

  const { email, motDePasse } = compte()
  await seConnecter(page, email, motDePasse)
  await expect(page.getByRole('heading', { name: 'Activités', exact: true })).toBeVisible()
  await page.goto('/nouveau-mot-de-passe')
  await expect(page).toHaveURL(/\/activites$/)
})

// Lit dans Mailpit le lien de réinitialisation envoyé à une adresse.
async function lienDeReinitialisation(email: string): Promise<string> {
  const recherche = `${URL_MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`
  let lien: string | undefined
  await expect
    .poll(
      async () => {
        const reponse = await fetch(recherche)
        const { messages } = (await reponse.json()) as { messages: { ID: string }[] }
        if (messages.length === 0) return false
        const detail = await fetch(`${URL_MAILPIT}/api/v1/message/${messages[0].ID}`)
        const { Text } = (await detail.json()) as { Text: string }
        lien = /https?:\/\/\S*\/auth\/v1\/verify\?\S+/.exec(Text)?.[0]
        return lien !== undefined
      },
      { message: 'e-mail de réinitialisation attendu dans Mailpit', timeout: 20_000 },
    )
    .toBe(true)
  return (lien as string).replace(/[)>\].,]+$/, '')
}

test('réinitialisation complète : demande, e-mail, lien, nouveau mot de passe, connexion', async ({
  page,
}) => {
  const compteDedie = await creerCompte('e2e-reinitialisation')
  const nouveauMotDePasse = `Nouveau-${randomUUID()}`
  try {
    // 1. Demande du lien.
    await page.getByRole('button', { name: 'Mot de passe oublié' }).click()
    await page.getByLabel('E-mail').fill(compteDedie.email)
    await page.getByRole('button', { name: 'Envoyer le lien' }).click()
    await expect(page.getByText('Si un compte existe, un e-mail a été envoyé')).toBeVisible()

    // 2. E-mail reçu dans Mailpit, puis clic sur le lien.
    const lien = await lienDeReinitialisation(compteDedie.email)

    // La liste des activités ne doit JAMAIS s'afficher avant le choix du mot
    // de passe, alors que le lien a ouvert une session.
    const adressesVisitees: string[] = []
    page.on('framenavigated', (cadre) => {
      if (cadre === page.mainFrame()) adressesVisitees.push(new URL(cadre.url()).pathname)
    })
    await page.goto(lien)

    await expect(page.getByRole('heading', { name: 'Nouveau mot de passe' })).toBeVisible()
    await expect(page).toHaveURL(/\/nouveau-mot-de-passe$/)
    expect(adressesVisitees.filter((adresse) => adresse.startsWith('/activites'))).toEqual([])

    // Tant que le mot de passe n'est pas choisi, les activités restent inaccessibles.
    await page.goto('/activites')
    await expect(page).toHaveURL(/\/nouveau-mot-de-passe$/)

    // 3. Nouveau mot de passe.
    await page.getByLabel('Nouveau mot de passe').fill(nouveauMotDePasse)
    await page.getByLabel('Confirmation').fill(nouveauMotDePasse)
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByRole('heading', { name: 'Activités', exact: true })).toBeVisible()
    await expect(page).toHaveURL(/\/activites$/)

    // 4. Déconnexion, puis connexion : l'ancien mot de passe est refusé, le nouveau accepté.
    await page.getByRole('button', { name: 'Se déconnecter' }).click()
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
    await seConnecter(page, compteDedie.email, compteDedie.motDePasse)
    await expect(page.getByRole('alert')).toHaveText('Identifiants incorrects')
    await seConnecter(page, compteDedie.email, nouveauMotDePasse)
    await expect(page.getByRole('heading', { name: 'Activités', exact: true })).toBeVisible()
  } finally {
    await supprimerCompte(compteDedie)
  }
})
