// Parcours de l'écran Paramètres (J2 · étape 2.3), sur ordinateur et
// smartphone : grade et historique de grades, taux du grade, compte.
//
// Chaque test crée ses propres comptes fictifs ; aucun test ne lit ni ne
// modifie l'historique d'un autre utilisateur. Les grades et taux utilisés
// sont ceux du seed (FICTIFS) : Sapeur, Caporal ; pour un Sapeur, intervention
// à 10,00 €/h jusqu'au 30/06/2026 et garde à 8,00 €/h depuis le 01/01/2025.

import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { creerCompte, type CompteTest } from '../helpers/comptes.ts'
import {
  creerCompteAvecGrade,
  dateDuJourParis,
  jourFrancais,
  lienDeReinitialisation,
  nettoyerReferentiel,
  requeteSql,
  seConnecter,
  supprimerCompte,
} from './aides.ts'

let comptes: CompteTest[] = []
let suffixe: string

test.beforeEach(() => {
  comptes = []
  suffixe = randomUUID().slice(0, 8)
})

test.afterEach(async () => {
  for (const compte of comptes) await supprimerCompte(compte)
  await nettoyerReferentiel(suffixe)
})

async function compteSansGrade(): Promise<CompteTest> {
  const compte = await creerCompte('e2e-parametres')
  comptes.push(compte)
  return compte
}

/** Compte avec le grade « Sapeur » du seed depuis le 01/01/2025. */
async function compteSapeur(): Promise<CompteTest> {
  const compte = await creerCompteAvecGrade('e2e-parametres')
  comptes.push(compte)
  return compte
}

async function ouvrirParametres(page: Page, compte: CompteTest): Promise<void> {
  await page.goto('/parametres')
  await seConnecter(page, compte.email, compte.motDePasse)
  await expect(page.getByRole('heading', { name: 'Paramètres', exact: true })).toBeVisible()
}

function historique(page: Page) {
  return page.getByRole('list', { name: 'Historique de mes grades' }).getByRole('listitem')
}

/** Ouvre « Ajouter un grade », choisit le grade et la date, enregistre. */
async function ajouterGrade(page: Page, grade: string, dateEffet?: string): Promise<void> {
  await page.getByRole('button', { name: 'Ajouter un grade' }).click()
  const formulaire = page.getByRole('form', { name: 'Nouveau grade' })
  await formulaire.getByLabel('Grade').selectOption({ label: grade })
  if (dateEffet) await formulaire.getByLabel('Date d’effet').fill(dateEffet)
  await formulaire.getByRole('button', { name: 'Enregistrer' }).click()
}

const MESSAGE_AUCUN_GRADE =
  'Aucun grade renseigné : vos activités sont en « taux manquant ». Ajoutez votre grade.'

test('a) sans grade : messages, puis ajout à la date du jour avec confirmation, grade et taux affichés', async ({
  page,
}) => {
  const compte = await compteSansGrade()
  await ouvrirParametres(page, compte)

  await expect(page.getByText(MESSAGE_AUCUN_GRADE)).toBeVisible()
  await expect(page.getByText('Renseignez votre grade pour voir vos taux.')).toBeVisible()

  // La date d'effet proposée est la date du jour.
  await page.getByRole('button', { name: 'Ajouter un grade' }).click()
  const formulaire = page.getByRole('form', { name: 'Nouveau grade' })
  const aujourdhui = dateDuJourParis()
  await expect(formulaire.getByLabel('Date d’effet')).toHaveValue(aujourdhui)
  // Seuls des grades actifs sont proposés ; on choisit Sapeur.
  await formulaire.getByLabel('Grade').selectOption({ label: 'Sapeur' })
  await formulaire.getByRole('button', { name: 'Enregistrer' }).click()

  // La date du jour est « passée » : confirmation de D-021.
  const confirmation = page.getByRole('alertdialog')
  await expect(confirmation).toContainText(
    `Les montants de vos activités à partir du ${jourFrancais(aujourdhui)} seront recalculés.`,
  )
  await confirmation.getByRole('button', { name: 'Confirmer' }).click()

  await expect(page.getByText('Grade ajouté', { exact: true })).toBeVisible()
  await expect(page.getByText('Grade actuel : Sapeur')).toBeVisible()
  await expect(page.getByText(MESSAGE_AUCUN_GRADE)).toHaveCount(0)
  await expect(historique(page).filter({ hasText: 'Sapeur' })).toContainText('Actuel')

  const taux = page.getByRole('list', { name: 'Taux de mon grade' })
  await expect(taux.getByRole('listitem').filter({ hasText: 'Garde' })).toContainText(
    '8,00 €/h depuis le 01/01/2025',
  )
  // Lecture seule : aucune action dans les taux.
  await expect(taux.getByRole('button')).toHaveCount(0)
})

test('b) une activité en « taux manquant » prend un montant après l’ajout d’un grade passé', async ({
  page,
}) => {
  const compte = await compteSansGrade()
  // Intervention de 2 h le 10/06/2026, saisie avant tout grade.
  await requeteSql(
    `insert into public.activities (user_id, activity_type_id, debut, fin)
     select $1, t.id, '2026-06-10T08:00:00+02:00', '2026-06-10T10:00:00+02:00'
     from public.activity_types t where t.code = 'INT'`,
    [compte.id],
  )

  await page.goto('/activites?mois=2026-06')
  await seConnecter(page, compte.email, compte.motDePasse)
  const ligne = page.getByRole('list', { name: 'Activités du mois' }).getByRole('link')
  await expect(ligne).toContainText('Taux manquant')

  // Ajout du grade Sapeur au 01/01/2026, depuis le menu.
  await page
    .getByRole('navigation', { name: 'Menu principal' })
    .getByRole('link', { name: 'Paramètres' })
    .click()
  await ajouterGrade(page, 'Sapeur', '2026-01-01')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmer' }).click()
  await expect(page.getByText('Grade ajouté', { exact: true })).toBeVisible()

  // Retour à la liste : le montant est recalculé sans recharger la page.
  await page.goBack()
  await expect(page).toHaveURL(/\/activites\?mois=2026-06$/)
  // 2 h à 10,00 €/h (taux fictif d'un Sapeur en juin 2026).
  await expect(ligne).toContainText('20,00 €')
  await expect(ligne).not.toContainText('Taux manquant')
})

test('c) un grade à date d’effet future s’ajoute sans confirmation, mention « À venir »', async ({
  page,
}) => {
  const compte = await compteSapeur()
  await ouvrirParametres(page, compte)
  const futur = `${Number(dateDuJourParis().slice(0, 4)) + 1}-01-01`

  await ajouterGrade(page, 'Caporal', futur)

  await expect(page.getByText('Grade ajouté', { exact: true })).toBeVisible()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(historique(page).filter({ hasText: 'Caporal' })).toContainText('À venir')
  await expect(historique(page).filter({ hasText: 'Caporal' })).toContainText(
    `Date d’effet : ${jourFrancais(futur)}`,
  )
  // Le grade actuel reste Sapeur.
  await expect(page.getByText('Grade actuel : Sapeur')).toBeVisible()
  await expect(historique(page).filter({ hasText: 'Sapeur' })).toContainText('Actuel')
})

test('d) un deuxième grade à la même date d’effet est refusé (D-028)', async ({ page }) => {
  const compte = await compteSapeur()
  await ouvrirParametres(page, compte)

  await ajouterGrade(page, 'Caporal', '2025-01-01')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmer' }).click()

  const formulaire = page.getByRole('form', { name: 'Nouveau grade' })
  await expect(formulaire.getByText('Un grade est déjà enregistré à cette date.')).toBeVisible()
  // La saisie est conservée ; l'historique n'a pas changé.
  await expect(formulaire.getByLabel('Date d’effet')).toHaveValue('2025-01-01')
  await expect(historique(page)).toHaveCount(1)
})

test('e) correction puis suppression d’une ligne, avec confirmation', async ({ page }) => {
  const compte = await compteSapeur()
  await ouvrirParametres(page, compte)

  // Correction de la date : 01/01/2025 → 01/02/2025, deux dates passées.
  await historique(page).filter({ hasText: 'Sapeur' }).getByRole('button', { name: 'Corriger' }).click()
  const formulaire = page.getByRole('form', { name: 'Corriger le grade' })
  await expect(formulaire.getByLabel('Grade')).toHaveValue(/.+/)
  await formulaire.getByLabel('Date d’effet').fill('2025-02-01')
  await formulaire.getByRole('button', { name: 'Enregistrer' }).click()
  const confirmation = page.getByRole('alertdialog')
  await expect(confirmation).toContainText(
    'Les montants de vos activités à partir du 01/01/2025 seront recalculés.',
  )
  await confirmation.getByRole('button', { name: 'Confirmer' }).click()
  await expect(page.getByText('Grade modifié', { exact: true })).toBeVisible()
  await expect(historique(page).filter({ hasText: 'Sapeur' })).toContainText(
    'Date d’effet : 01/02/2025',
  )

  // Suppression.
  await historique(page).filter({ hasText: 'Sapeur' }).getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('Supprimer cette ligne ?')
  await expect(page.getByRole('alertdialog')).toContainText(
    'Les montants de vos activités concernées seront recalculés.',
  )
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByText('Grade supprimé', { exact: true })).toBeVisible()
  await expect(historique(page)).toHaveCount(0)
  await expect(page.getByText(MESSAGE_AUCUN_GRADE)).toBeVisible()
})

test('f) un grade archivé par l’administrateur du seed n’est plus proposé à l’ajout', async ({
  page,
  browser,
}) => {
  const libelle = `E2E Archive ${suffixe}`
  await requeteSql(`insert into public.grades (libelle, ordre) values ($1, 960)`, [libelle])
  const compte = await compteSansGrade()
  await ouvrirParametres(page, compte)

  // Avant l'archivage, le grade est proposé.
  await page.getByRole('button', { name: 'Ajouter un grade' }).click()
  const choix = page.getByRole('form', { name: 'Nouveau grade' }).getByLabel('Grade')
  await expect(choix.locator('option', { hasText: libelle })).toHaveCount(1)

  // L'administrateur du seed l'archive, dans son propre navigateur.
  const baseURL = test.info().project.use.baseURL
  const contexteAdmin = await browser.newContext({ baseURL, locale: 'fr-FR', timezoneId: 'Europe/Paris' })
  try {
    const admin = await contexteAdmin.newPage()
    await admin.goto('/admin/grades')
    await seConnecter(admin, 'admin@example.com', 'admin-spv-local')
    const ligne = admin
      .getByRole('list', { name: 'Liste des grades' })
      .getByRole('listitem')
      .filter({ hasText: libelle })
    await ligne.getByRole('button', { name: 'Archiver' }).click()
    await expect(ligne).toContainText('Archivé')
  } finally {
    await contexteAdmin.close()
  }

  // Après rechargement, le grade archivé n'est plus proposé.
  await page.reload()
  await page.getByRole('button', { name: 'Ajouter un grade' }).click()
  await expect(choix.locator('option', { hasText: 'Sapeur' })).toHaveCount(1)
  await expect(choix.locator('option', { hasText: libelle })).toHaveCount(0)
})

test('g) « Changer le mot de passe » envoie le lien de réinitialisation par e-mail', async ({
  page,
}) => {
  const compte = await compteSansGrade()
  await ouvrirParametres(page, compte)

  const sectionCompte = page.getByRole('region', { name: 'Compte' })
  await expect(sectionCompte).toContainText(compte.email)
  await sectionCompte.getByRole('button', { name: 'Changer le mot de passe' }).click()
  await expect(
    page.getByText('Un lien de réinitialisation vous a été envoyé par e-mail.'),
  ).toBeVisible()

  const lien = await lienDeReinitialisation(compte.email)
  expect(lien).toMatch(/\/auth\/v1\/verify\?/)
})

test('h) l’entrée « Paramètres » est visible pour un utilisateur non administrateur', async ({
  page,
}) => {
  const compte = await compteSansGrade()
  await page.goto('/activites')
  await seConnecter(page, compte.email, compte.motDePasse)

  const menu = page.getByRole('navigation', { name: 'Menu principal' })
  await menu.getByRole('link', { name: 'Paramètres' }).click()
  await expect(page).toHaveURL(/\/parametres$/)
  await expect(page.getByRole('heading', { name: 'Paramètres', exact: true })).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Administration' })).toHaveCount(0)
})
