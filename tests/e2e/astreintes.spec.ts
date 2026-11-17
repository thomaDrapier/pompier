// Parcours de l'écran Astreintes (J3 · étape 3.3), sur ordinateur et
// smartphone. Chaque test crée son propre compte fictif et ses activités, par
// SQL, aux heures de Paris.

import { expect, test, type Page } from '@playwright/test'
import { creerCompte, type CompteTest } from '../helpers/comptes.ts'
import {
  creerCompteAvecGrade,
  dateDuJourParis,
  insererActivite,
  jourDuMois,
  seConnecter,
  supprimerCompte,
} from './aides.ts'

let comptes: CompteTest[] = []

test.beforeEach(() => {
  comptes = []
})

test.afterEach(async () => {
  for (const compte of comptes) await supprimerCompte(compte)
})

async function compteSapeur(): Promise<CompteTest> {
  const compte = await creerCompteAvecGrade('e2e-astreintes')
  comptes.push(compte)
  return compte
}

async function ouvrir(page: Page, adresse: string, compte: CompteTest): Promise<void> {
  await page.goto(adresse)
  await seConnecter(page, compte.email, compte.motDePasse)
  await expect(page.getByRole('heading', { name: 'Astreintes', exact: true })).toBeVisible()
}

function totaux(page: Page) {
  return page.getByRole('region', { name: 'Totaux de la période' })
}

function jour(page: Page, debut: RegExp) {
  return page.getByRole('list', { name: 'Jours de la semaine' }).getByRole('button', { name: debut })
}

test('a) semaine : astreinte du dimanche au lundi, ventilée par jour et « à cheval »', async ({
  page,
}) => {
  const compte = await compteSapeur()
  const astreinte = await insererActivite(compte, 'AST', '2026-11-15', '18:00', '2026-11-16', '08:00')
  await insererActivite(compte, 'VSAV', '2026-11-15', '23:00', '2026-11-16', '01:00')

  await ouvrir(page, '/astreintes?vue=semaine&periode=2026-W46', compte)
  await expect(totaux(page)).toContainText('6 h 00 · 1 h 00 · 5 h 00')

  // Dimanche : nette 5 h, déduite 1 h.
  const dimanche = jour(page, /^dim\. 15\/11\/2026/)
  await expect(dimanche).toContainText('6 h 00 · 1 h 00 · 5 h 00')
  await dimanche.click()
  const liste = page.getByRole('list', { name: 'Jours de la semaine' })
  await expect(liste).toContainText('à cheval')
  await expect(liste).toContainText('Part du jour : 6 h 00 · 1 h 00 · 5 h 00')
  await expect(liste.getByRole('link', { name: 'Modifier l’astreinte' })).toHaveAttribute(
    'href',
    `/activites/${astreinte}`,
  )

  // Semaine suivante : le lundi reçoit sa part (nette 7 h, déduite 1 h).
  await page.getByRole('button', { name: 'Semaine suivante' }).click()
  await expect(page).toHaveURL(/periode=2026-W47/)
  await expect(totaux(page)).toContainText('8 h 00 · 1 h 00 · 7 h 00')
  const lundi = jour(page, /^lun\. 16\/11\/2026/)
  await expect(lundi).toContainText('8 h 00 · 1 h 00 · 7 h 00')
  await lundi.click()
  await expect(liste).toContainText('à cheval')
})

test('b) mois : lignes par semaine ISO limitées au mois ; mêmes totaux que l’accueil', async ({
  page,
}) => {
  const compte = await compteSapeur()
  // Mois en cours : 14 h d'astreinte dont 1 h 30 couverte par une intervention.
  await insererActivite(compte, 'AST', jourDuMois(10), '18:00', jourDuMois(11), '08:00')
  await insererActivite(compte, 'VSAV', jourDuMois(10), '23:00', jourDuMois(11), '00:30')

  await ouvrir(page, '/astreintes?vue=mois', compte)
  await expect(totaux(page)).toContainText('14 h 00 · 1 h 30 · 12 h 30')

  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Accueil' }).click()
  await expect(page.getByRole('region', { name: 'Synthèse du mois' })).toContainText(
    'Astreinte nette12 h 30',
  )

  // Novembre 2026 : du dimanche 1er au lundi 30, soit 6 semaines ISO.
  await page.goto('/astreintes?vue=mois&periode=2026-11')
  const semaines = page.getByRole('list', { name: 'Semaines du mois' }).getByRole('listitem')
  await expect(semaines).toHaveCount(6)
  await expect(semaines.first()).toContainText('Semaine 44')
  await expect(semaines.first()).toContainText('du 01/11/2026 au 01/11/2026')
  await expect(semaines.last()).toContainText('du 30/11/2026 au 30/11/2026')
})

test('c) une astreinte en « taux manquant » est comptée dans les durées (D-035)', async ({
  page,
}) => {
  // Compte sans grade : toutes ses activités sont en « taux manquant ».
  const compte = await creerCompte('e2e-astreintes-sans-grade')
  comptes.push(compte)
  await insererActivite(compte, 'AST', '2026-11-17', '08:00', '2026-11-17', '12:00')

  await ouvrir(page, '/astreintes?vue=semaine&periode=2026-W47', compte)
  await expect(totaux(page)).toContainText('4 h 00 · 0 h 00 · 4 h 00')
  await expect(page.getByText('Aucune astreinte sur cette période.')).toHaveCount(0)
})

test('d) précédent / suivant ; vue et période conservées par le bouton retour', async ({ page }) => {
  const compte = await compteSapeur()
  await ouvrir(page, '/astreintes?vue=mois&periode=2026-11', compte)
  await expect(page.getByRole('heading', { name: 'novembre 2026' })).toBeVisible()
  await expect(page.getByText('Aucune astreinte sur cette période.')).toBeVisible()

  await page.getByRole('button', { name: 'Mois précédent' }).click()
  await expect(page).toHaveURL(/vue=mois&periode=2026-10$/)
  await expect(page.getByRole('heading', { name: 'octobre 2026' })).toBeVisible()

  // Passage à la vue Semaine : semaine du 1er octobre 2026 (jeudi).
  await page.getByRole('group', { name: 'Vue' }).getByRole('button', { name: 'Semaine' }).click()
  await expect(page).toHaveURL(/vue=semaine&periode=2026-W40$/)
  await expect(page.getByRole('list', { name: 'Jours de la semaine' }).getByRole('listitem')).toHaveCount(7)

  await page.goBack()
  await expect(page).toHaveURL(/vue=mois&periode=2026-10$/)
  await page.goBack()
  await expect(page).toHaveURL(/vue=mois&periode=2026-11$/)

  // Une période invalide est ignorée : période en cours.
  await page.goto('/astreintes?vue=mois&periode=2026-13')
  await expect(page.getByRole('heading', { name: 'Astreintes', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mois précédent' })).toBeVisible()
})

test('e) depuis l’accueil, l’astreinte nette ouvre la vue Mois du mois en cours', async ({ page }) => {
  const compte = await compteSapeur()
  await page.goto('/accueil')
  await seConnecter(page, compte.email, compte.motDePasse)

  await page.getByRole('link', { name: /Astreinte nette/ }).click()
  await expect(page).toHaveURL(
    new RegExp(`/astreintes\\?vue=mois&periode=${dateDuJourParis().slice(0, 7)}$`),
  )
  await expect(page.getByRole('group', { name: 'Vue' }).getByRole('button', { name: 'Mois' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // Le menu propose « Astreintes » juste après « Activités ».
  const menu = page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link')
  await expect(menu.nth(2)).toHaveText('Astreintes')
})
