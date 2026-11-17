// Parcours de l'écran Rémunération et de la case « Est une intervention »
// (J3 · étape 3.4), sur ordinateur et smartphone.
//
// Chaque test crée ses propres comptes fictifs et ses activités, par SQL, aux
// heures de Paris. Taux FICTIFS du seed pour un Sapeur depuis le 01/07/2026 :
// astreinte 2,00 €/h, intervention VSAV 11,00 €/h, garde 8,00 €/h ; la nature
// « DEMO » n'a aucun taux.

import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import type { CompteTest } from '../helpers/comptes.ts'
import {
  creerCompteAdmin,
  creerCompteAvecGrade,
  insererActivite,
  jourDuMois,
  nettoyerReferentiel,
  requeteSql,
  seConnecter,
  supprimerCompte,
  verifierSansDefilementHorizontal,
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

async function compteSapeur(): Promise<CompteTest> {
  const compte = await creerCompteAvecGrade('e2e-remuneration')
  comptes.push(compte)
  return compte
}

async function ouvrir(page: Page, adresse: string, compte: CompteTest): Promise<void> {
  await page.goto(adresse)
  await seConnecter(page, compte.email, compte.motDePasse)
  await expect(page.getByRole('heading', { name: 'Rémunération', exact: true })).toBeVisible()
}

function total(page: Page) {
  return page.getByRole('region', { name: 'Total de la période' })
}

test('a) semaine : total, détail par catégorie et par nature, activités avec montants ou « — »', async ({
  page,
}) => {
  const compte = await compteSapeur()
  await insererActivite(compte, 'AST', '2026-11-10', '18:00', '2026-11-11', '08:00')
  await insererActivite(compte, 'VSAV', '2026-11-10', '23:00', '2026-11-11', '00:30')
  await insererActivite(compte, 'GAR', '2026-11-12', '08:00', '2026-11-12', '10:00')
  await insererActivite(compte, 'DEMO', '2026-11-13', '10:00', '2026-11-13', '11:00')

  await ouvrir(page, '/remuneration?vue=semaine&periode=2026-W46', compte)

  // 12 h 30 nettes à 2,00 € + 1 h 30 à 11,00 € + 2 h à 8,00 € = 57,50 €.
  const bloc = total(page)
  const detail = bloc.getByRole('button', { name: /^Total 57,50 €$/ })
  await detail.click()
  await expect(bloc.getByRole('button', { name: /^Astreintes 25,00 €$/ })).toBeVisible()
  await expect(bloc.getByRole('button', { name: /^Autres activités 16,00 €$/ })).toBeVisible()
  await bloc.getByRole('button', { name: /^Interventions 16,50 €$/ }).click()
  await expect(bloc).toContainText('Intervention VSAV · 1 activité16,50 €')
  await expect(bloc).toContainText('Montants indicatifs, calculés à partir du référentiel.')
  await expect(page.getByRole('alert')).toHaveText('1 activité non comptée : taux manquant (1)')

  const activites = page.getByRole('list', { name: 'Activités de la semaine' }).getByRole('link')
  await expect(activites).toHaveCount(4)
  await expect(activites.filter({ hasText: 'Garde' })).toContainText('16,00 €')
  const sansTaux = activites.filter({ hasText: 'Réunion' })
  await expect(sansTaux).toContainText('—')
  await expect(sansTaux).toContainText('Taux manquant')
})

test('b) mois : écart avec le mois précédent, « — » si celui-ci vaut 0 €, lignes par semaine', async ({
  page,
}) => {
  const compte = await compteSapeur()
  await insererActivite(compte, 'GAR', '2026-10-15', '08:00', '2026-10-15', '10:00')
  await insererActivite(compte, 'GAR', '2026-11-05', '08:00', '2026-11-05', '10:00')
  await insererActivite(compte, 'GAR', '2026-11-06', '08:00', '2026-11-06', '09:00')

  await ouvrir(page, '/remuneration?vue=mois&periode=2026-11', compte)
  await expect(total(page)).toContainText('Total24,00 €')
  await expect(total(page)).toContainText('+8,00 € (+50 %) par rapport à octobre')
  const semaines = page.getByRole('list', { name: 'Semaines du mois' }).getByRole('listitem')
  await expect(semaines).toHaveCount(6)
  await expect(semaines.filter({ hasText: 'Semaine 45' })).toContainText('24,00 €')

  await page.getByRole('button', { name: 'Mois précédent' }).click()
  await expect(page).toHaveURL(/vue=mois&periode=2026-10$/)
  await expect(total(page)).toContainText('+16,00 € (—) par rapport à septembre')
})

test('c) astreinte à cheval sur deux mois : montant sur le mois de début, mention affichée', async ({
  page,
}) => {
  const compte = await compteSapeur()
  await insererActivite(compte, 'AST', '2026-10-31', '18:00', '2026-11-01', '08:00')
  const mention = '1 astreinte à cheval : montant compté sur la période de début.'

  // 14 h à 2,00 € : 28,00 €, comptés en octobre.
  await ouvrir(page, '/remuneration?vue=mois&periode=2026-10', compte)
  await expect(total(page)).toContainText('Total28,00 €')
  await expect(page.getByText(mention)).toBeVisible()

  await page.getByRole('button', { name: 'Mois suivant' }).click()
  await expect(total(page)).toContainText('Total0,00 €')
  await expect(page.getByText(mention)).toBeVisible()
})

test('d) historique : 12 derniers mois, année civile, graphique, toucher un mois', async ({ page }) => {
  const compte = await compteSapeur()
  await insererActivite(compte, 'AST', '2026-10-31', '18:00', '2026-11-01', '08:00')

  await ouvrir(page, '/remuneration?vue=historique', compte)
  const lignes = page.getByRole('table').getByRole('row')
  await expect(lignes).toHaveCount(13) // en-tête + 12 mois
  // Graphique : la surface principale de Recharts (les icônes de légende en sont aussi).
  await expect(
    page.getByRole('figure', { name: 'Rémunération par mois' }).locator('.recharts-surface').first(),
  ).toBeVisible()
  await expect(page.getByText('Astreintes', { exact: true }).first()).toBeVisible() // légende

  // Année civile 2026 : total annuel, puis toucher octobre ouvre la vue Mois.
  await page.goto('/remuneration?vue=historique&mode=annee&periode=2026')
  await expect(page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Année civile' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(lignes).toHaveCount(13)
  await expect(page.getByRole('region', { name: 'Total de l’année' })).toContainText('28,00 €')
  await expect(lignes.filter({ hasText: 'octobre 2026' })).toContainText('28,00 €')
  await page.getByRole('link', { name: 'octobre 2026' }).click()
  await expect(page).toHaveURL(/vue=mois&periode=2026-10$/)
  await expect(total(page)).toContainText('Total28,00 €')

  // Une année future : tous les mois sont vides.
  await page.goto('/remuneration?vue=historique&mode=annee&periode=2099')
  await expect(lignes.nth(1).getByRole('cell').first()).toHaveText('')
})

test('e) le total du mois est égal à la rémunération totale de l’accueil', async ({ page }) => {
  const compte = await compteSapeur()
  await insererActivite(compte, 'GAR', jourDuMois(14), '08:00', jourDuMois(14), '10:00')
  await insererActivite(compte, 'VSAV', jourDuMois(15), '10:00', jourDuMois(15), '11:00')

  await page.goto('/accueil')
  await seConnecter(page, compte.email, compte.motDePasse)
  await expect(
    page.getByRole('region', { name: 'Synthèse du mois' }).getByRole('button', { name: /^Rémunération 27,00 €$/ }),
  ).toBeVisible()

  const menu = page.getByRole('navigation', { name: 'Menu principal' })
  await menu.getByRole('link', { name: 'Rémunération' }).click()
  // Vue Mois par défaut, sur le mois en cours.
  await expect(total(page)).toContainText('Total27,00 €')
  await expect(menu.getByRole('link').nth(3)).toHaveText('Rémunération')
})

test('f) administration : nature d’intervention, exclusion des deux cases, indicateur modifiable, comptage', async ({
  page,
}) => {
  const admin = await creerCompteAdmin('e2e-remuneration-admin')
  comptes.push(admin)
  const utilisateur = await compteSapeur()
  const libelle = `E2E Interv ${suffixe}`
  const code = `E2E-IV-${suffixe}`

  await page.goto('/admin/natures')
  await seConnecter(page, admin.email, admin.motDePasse)
  await verifierSansDefilementHorizontal(page)

  // Création : cocher « Est une intervention » grise « Est une astreinte ».
  await page.getByRole('button', { name: 'Ajouter une nature' }).click()
  const ajout = page.getByRole('form', { name: 'Nouvelle nature' })
  await ajout.getByLabel('Libellé').fill(libelle)
  await ajout.getByLabel('Code').fill(code)
  await ajout.getByLabel('Ordre').fill('951')
  const explication = 'Une nature ne peut pas être à la fois une astreinte et une intervention.'
  await ajout.getByLabel('Est une intervention').check()
  await expect(ajout.getByLabel('Est une astreinte')).toBeDisabled()
  await expect(ajout.getByText(explication)).toBeVisible()
  await ajout.getByLabel('Est une intervention').uncheck()
  await expect(ajout.getByLabel('Est une astreinte')).toBeEnabled()
  // Et inversement.
  await ajout.getByLabel('Est une astreinte').check()
  await expect(ajout.getByLabel('Est une intervention')).toBeDisabled()
  await ajout.getByLabel('Est une astreinte').uncheck()
  await ajout.getByLabel('Est une intervention').check()
  await ajout.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Nature ajoutée', { exact: true })).toBeVisible()
  const ligne = page.getByRole('list', { name: 'Liste des natures' }).getByRole('listitem').filter({ hasText: libelle })
  await expect(ligne).toContainText('Intervention')

  // La nature sert à une activité de l'utilisateur : l'indicateur reste modifiable.
  await insererActivite(utilisateur, code, jourDuMois(12), '10:00', jourDuMois(12), '11:00')
  await page.reload()
  await ligne.getByRole('button', { name: 'Modifier' }).click()
  const modification = page.getByRole('form', { name: 'Modifier la nature' })
  await expect(modification.getByLabel('Est une intervention')).toBeEnabled()
  await modification.getByLabel('Est une intervention').uncheck()
  await modification.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Nature modifiée', { exact: true })).toBeVisible()
  await expect
    .poll(async () => (await requeteSql(`select est_intervention from public.activity_types where code = $1`, [code])).rows[0].est_intervention)
    .toBe(false)
  await ligne.getByRole('button', { name: 'Modifier' }).click()
  await page.getByRole('form', { name: 'Modifier la nature' }).getByLabel('Est une intervention').check()
  await page.getByRole('form', { name: 'Modifier la nature' }).getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Nature modifiée', { exact: true })).toBeVisible()

  // L'activité de l'utilisateur compte dans ses interventions (sans taux : en anomalie).
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await page.goto('/accueil')
  await seConnecter(page, utilisateur.email, utilisateur.motDePasse)
  await expect(
    page
      .getByRole('region', { name: 'Synthèse du mois' })
      .getByRole('button', { name: /^Interventions 1 \(dont 1 en anomalie\)$/ }),
  ).toBeVisible()
})
