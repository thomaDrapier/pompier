// Parcours de l'Accueil et de la liste des activités (J3 · étape 3.2), sur
// ordinateur et smartphone.
//
// Chaque test crée son propre compte fictif (grade « Sapeur » du seed depuis le
// 01/01/2025) et ses activités, dans le mois en cours (heure de Paris), par SQL.
// Taux FICTIFS du seed pour un Sapeur depuis le 01/07/2026 : astreinte
// 2,00 €/h, interventions VSAV et FPT 11,00 €/h, garde 8,00 €/h.

import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { creerCompte, type CompteTest } from '../helpers/comptes.ts'
import {
  creerCompteAvecGrade,
  dateDuJourParis,
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

async function compteSapeur(): Promise<CompteTest> {
  const compte = await creerCompteAvecGrade('e2e-accueil')
  comptes.push(compte)
  return compte
}

/** Jour `jour` du mois en cours (Paris), « AAAA-MM-JJ ». */
function jourDuMois(jour: number): string {
  return `${dateDuJourParis().slice(0, 7)}-${String(jour).padStart(2, '0')}`
}

/** Dernier jour du mois précédent (Paris), « AAAA-MM-JJ ». */
function veilleDuMois(): string {
  const [annee, mois] = dateDuJourParis().split('-').map(Number)
  return new Date(Date.UTC(annee, mois - 1, 0)).toISOString().slice(0, 10)
}

/** Lendemain d'une date « AAAA-MM-JJ ». */
function lendemain(date: string): string {
  const [annee, mois, jour] = date.split('-').map(Number)
  return new Date(Date.UTC(annee, mois - 1, jour + 1)).toISOString().slice(0, 10)
}

/** Crée une activité (heures de Paris) ; la nature est désignée par son code. */
async function activite(
  compte: CompteTest,
  code: string,
  jourDebut: string,
  heureDebut: string,
  jourFin: string,
  heureFin: string,
): Promise<void> {
  await requeteSql(
    `insert into public.activities (user_id, activity_type_id, debut, fin)
     select $1, t.id,
            ($3::date + $4::time) at time zone 'Europe/Paris',
            ($5::date + $6::time) at time zone 'Europe/Paris'
     from public.activity_types t where t.code = $2`,
    [compte.id, code, jourDebut, heureDebut, jourFin, heureFin],
  )
}

/**
 * Mois de référence : astreinte du 10 au 11 (14 h) avec une intervention VSAV
 * de 1 h 30 pendant, une VSAV de 1 h, une FPT de 2 h, une garde de 2 h.
 * Astreinte nette 12 h 30 → 25,00 € ; interventions 16,50 + 11,00 + 22,00 =
 * 49,50 € ; garde 16,00 € ; total 90,50 €.
 */
async function moisDeReference(compte: CompteTest): Promise<void> {
  await activite(compte, 'AST', jourDuMois(10), '18:00', jourDuMois(11), '08:00')
  await activite(compte, 'VSAV', jourDuMois(10), '23:00', jourDuMois(11), '00:30')
  await activite(compte, 'VSAV', jourDuMois(12), '10:00', jourDuMois(12), '11:00')
  await activite(compte, 'FPT', jourDuMois(13), '10:00', jourDuMois(13), '12:00')
  await activite(compte, 'GAR', jourDuMois(14), '08:00', jourDuMois(14), '10:00')
}

function synthese(page: Page) {
  return page.getByRole('region', { name: 'Synthèse du mois' })
}

test('a) arrivée sur l’accueil ; racine et adresse inconnue y renvoient ; adresse demandée conservée', async ({
  page,
}) => {
  const compte = await compteSapeur()
  await page.goto('/')
  await seConnecter(page, compte.email, compte.motDePasse)
  await expect(page).toHaveURL(/\/accueil$/)
  await expect(page.getByRole('heading', { name: 'Accueil', exact: true })).toBeVisible()

  await page.goto('/')
  await expect(page).toHaveURL(/\/accueil$/)
  await page.goto('/adresse-inconnue')
  await expect(page).toHaveURL(/\/accueil$/)

  // Déconnecté, une adresse demandée reste prioritaire après la connexion.
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await page.goto('/parametres')
  await seConnecter(page, compte.email, compte.motDePasse)
  await expect(page).toHaveURL(/\/parametres$/)

  // Le menu commence par « Accueil ».
  const menu = page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link')
  await expect(menu.first()).toHaveText('Accueil')
})

test('b) accueil : astreinte nette, interventions et rémunération, détails dépliables', async ({
  page,
}) => {
  const compte = await compteSapeur()
  await moisDeReference(compte)
  await page.goto('/accueil')
  await seConnecter(page, compte.email, compte.motDePasse)

  const bloc = synthese(page)
  await expect(bloc).toContainText('Astreinte nette12 h 30')

  // Interventions : 3, dépliable par nature.
  const interventions = bloc.getByRole('button', { name: /^Interventions 3$/ })
  await expect(interventions).toHaveAttribute('aria-expanded', 'false')
  await interventions.click()
  await expect(interventions).toHaveAttribute('aria-expanded', 'true')
  await expect(bloc).toContainText('Intervention VSAV2')
  await expect(bloc).toContainText('Intervention FPT1')

  // Rémunération : 90,50 €, dépliable par catégorie puis par nature.
  const remuneration = bloc.getByRole('button', { name: /^Rémunération 90,50 €$/ })
  await remuneration.click()
  await expect(bloc.getByRole('button', { name: /^Astreintes 25,00 €$/ })).toBeVisible()
  await expect(bloc.getByRole('button', { name: /^Autres activités 16,00 €$/ })).toBeVisible()
  const categorieInterventions = bloc.getByRole('button', { name: /^Interventions 49,50 €$/ })
  await categorieInterventions.click()
  await expect(bloc).toContainText('Intervention VSAV · 2 activités27,50 €')
  await expect(bloc).toContainText('Intervention FPT · 1 activité22,00 €')

  // Un second toucher replie le détail.
  await categorieInterventions.click()
  await expect(bloc).not.toContainText('Intervention FPT · 1 activité')

  await expect(page.getByText('Aucune activité ce mois-ci.')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Nouvelle activité' })).toBeVisible()
})

test('c) une intervention en « taux manquant » est comptée et signalée, son montant exclu', async ({
  page,
}) => {
  const compte = await compteSapeur()
  // Nature d'intervention FICTIVE sans aucun taux.
  await requeteSql(
    `insert into public.activity_types (code, libelle, est_intervention, ordre)
     values ($1, $2, true, 950)`,
    [`E2E-I-${suffixe}`, `E2E Intervention ${suffixe}`],
  )
  await activite(compte, 'VSAV', jourDuMois(12), '10:00', jourDuMois(12), '11:00')
  await activite(compte, `E2E-I-${suffixe}`, jourDuMois(13), '10:00', jourDuMois(13), '11:00')

  await page.goto('/accueil')
  await seConnecter(page, compte.email, compte.motDePasse)

  const bloc = synthese(page)
  const interventions = bloc.getByRole('button', { name: /^Interventions 2 \(dont 1 en anomalie\)$/ })
  await expect(interventions).toBeVisible()
  // Le chiffre est mis en évidence comme une anomalie.
  await expect(interventions.locator('.text-destructive').first()).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText('1 activité non comptée : taux manquant (1)')
  // Seule l'intervention VSAV est rémunérée.
  await expect(bloc.getByRole('button', { name: /^Rémunération 11,00 €$/ })).toBeVisible()
})

test('d) astreinte à cheval sur deux mois : part du mois seulement, mention affichée', async ({
  page,
}) => {
  const compte = await compteSapeur()
  const veille = veilleDuMois()
  await activite(compte, 'AST', veille, '18:00', lendemain(veille), '08:00')

  await page.goto('/accueil')
  await seConnecter(page, compte.email, compte.motDePasse)

  // 8 h dans le mois en cours (6 h dans le mois précédent).
  await expect(synthese(page)).toContainText('Astreinte nette8 h 00')
  await expect(
    page.getByText(
      '1 astreinte à cheval sur deux mois : heures réparties, montant compté sur le mois de début.',
    ),
  ).toBeVisible()
  // Le montant est compté sur le mois précédent.
  await expect(synthese(page).getByRole('button', { name: /^Rémunération 0,00 €$/ })).toBeVisible()
})

test('e) compte sans grade : message et lien vers Paramètres', async ({ page }) => {
  const compte = await creerCompte('e2e-accueil-sans-grade')
  comptes.push(compte)
  await page.goto('/accueil')
  await seConnecter(page, compte.email, compte.motDePasse)

  await expect(
    page.getByText('Renseignez votre grade dans Paramètres pour calculer vos montants.'),
  ).toBeVisible()
  // Mois vide : chiffres à zéro et message.
  await expect(page.getByText('Aucune activité ce mois-ci.')).toBeVisible()
  await page.getByRole('main').getByRole('link', { name: 'Paramètres' }).click()
  await expect(page).toHaveURL(/\/parametres$/)
})

test('f) liste : filtre « Interventions », étiquette, totaux identiques à l’accueil', async ({
  page,
}) => {
  const compte = await compteSapeur()
  await moisDeReference(compte)
  await page.goto('/accueil')
  await seConnecter(page, compte.email, compte.motDePasse)
  await expect(synthese(page)).toContainText('Astreinte nette12 h 30')

  await page.getByRole('link', { name: 'Voir les activités du mois' }).click()
  await expect(page).toHaveURL(/\/activites$/)

  const totaux = page.getByRole('region', { name: 'Totaux du mois' })
  await expect(totaux).toContainText('Montant total90,50 €')
  await expect(totaux).toContainText('Astreinte nette12 h 30')
  await expect(totaux).toContainText('Interventions3')

  const lignes = page.getByRole('list', { name: 'Activités du mois' }).getByRole('link')
  await expect(lignes).toHaveCount(5)
  await page.getByLabel('Nature').selectOption({ label: 'Interventions' })
  await expect(page).toHaveURL(/nature=interventions/)
  await expect(lignes).toHaveCount(3)
  for (const ligne of await lignes.all()) {
    await expect(ligne.getByText('Intervention', { exact: true })).toBeVisible()
  }
  // Les totaux portent toujours sur le mois entier.
  await expect(totaux).toContainText('Montant total90,50 €')

  // Le filtre est conservé par le bouton retour.
  await lignes.first().click()
  await page.goBack()
  await expect(page).toHaveURL(/nature=interventions/)
  await expect(lignes).toHaveCount(3)
})
