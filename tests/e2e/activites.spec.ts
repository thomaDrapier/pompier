// Parcours des écrans « Liste des activités » et « Saisie / modification »
// (J1 · étape 1.2b), sur ordinateur et smartphone.
//
// Chaque test crée son propre compte fictif, avec le grade « Sapeur » du seed :
// les tests peuvent tourner en parallèle sans se gêner.
// Taux FICTIFS du seed pour un Sapeur en juin 2026 : astreinte 1,00 €/h,
// intervention 10,00 €/h.

import { expect, test } from '@playwright/test'
import type { CompteTest } from '../helpers/comptes.ts'
import {
  creerCompteAvecGrade,
  lignesActivites,
  remplirActivite,
  saisirActivite,
  seConnecter,
  supprimerCompte,
} from './aides.ts'

let compte: CompteTest

test.beforeEach(async ({ page }) => {
  compte = await creerCompteAvecGrade('e2e-activites')
  await page.goto('/activites?mois=2026-06')
  await seConnecter(page, compte.email, compte.motDePasse)
  await expect(page.getByRole('heading', { name: 'juin 2026' })).toBeVisible()
})

test.afterEach(async () => {
  await supprimerCompte(compte)
})

const astreinteMatin = {
  nature: 'Astreinte',
  dateDebut: '2026-06-26',
  heureDebut: '08:00',
  heureFin: '12:00',
}

test('a) exemple de référence : astreinte nette de 3 h 15 et montants du seed', async ({ page }) => {
  await saisirActivite(page, astreinteMatin)
  await expect(page.getByText('Activité enregistrée')).toBeVisible()
  await saisirActivite(page, {
    nature: 'Intervention',
    dateDebut: '2026-06-26',
    heureDebut: '08:00',
    heureFin: '08:45',
  })

  await expect(page).toHaveURL(/\/activites\?mois=2026-06$/)
  await expect(lignesActivites(page)).toHaveCount(2)

  const astreinte = lignesActivites(page).filter({ hasText: 'Astreinte' })
  await expect(astreinte).toContainText('ven. 26/06/2026 08:00 – 12:00')
  await expect(astreinte).toContainText('déclarée 4 h 00 · déduite 0 h 45 · nette 3 h 15')
  // 3 h 15 à 1,00 €/h (taux fictif).
  await expect(astreinte).toContainText('3,25 €')

  const intervention = lignesActivites(page).filter({ hasText: 'Intervention' })
  await expect(intervention).toContainText('0 h 45')
  // 0 h 45 à 10,00 €/h (taux fictif).
  await expect(intervention).toContainText('7,50 €')

  const totaux = page.getByRole('region', { name: 'Totaux du mois' })
  await expect(totaux).toContainText('10,75 €')
  await expect(totaux).toContainText('3 h 15')
})

test('b) une astreinte qui en chevauche une autre est refusée, rien n’est enregistré', async ({
  page,
}) => {
  await saisirActivite(page, astreinteMatin)
  await expect(lignesActivites(page)).toHaveCount(1)

  await saisirActivite(page, { ...astreinteMatin, heureDebut: '10:00', heureFin: '14:00' })

  await expect(
    page.getByText('Cette astreinte chevauche celle du ven. 26/06/2026 08:00 – 12:00.'),
  ).toBeVisible()
  // Toujours sur le formulaire, la saisie est conservée.
  await expect(page.getByRole('heading', { name: 'Nouvelle activité' })).toBeVisible()
  await expect(page.getByLabel('Heure de fin')).toHaveValue('14:00')

  await page.getByRole('link', { name: 'Annuler' }).click()
  await expect(lignesActivites(page)).toHaveCount(1)
})

test('c) deux astreintes contiguës sont acceptées', async ({ page }) => {
  await saisirActivite(page, astreinteMatin)
  await expect(lignesActivites(page)).toHaveCount(1)

  await saisirActivite(page, { ...astreinteMatin, heureDebut: '12:00', heureFin: '18:00' })

  await expect(page.getByText('Activité enregistrée')).toBeVisible()
  await expect(lignesActivites(page)).toHaveCount(2)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('d) modification puis suppression d’une activité', async ({ page }) => {
  await saisirActivite(page, astreinteMatin)
  await expect(lignesActivites(page)).toHaveCount(1)

  // Modification : la fin passe de 12:00 à 13:00.
  await lignesActivites(page).first().click()
  await expect(page.getByRole('heading', { name: 'Modifier l’activité' })).toBeVisible()
  await expect(page.getByLabel('Heure de début')).toHaveValue('08:00')
  await expect(page.getByLabel('Heure de fin')).toHaveValue('12:00')
  await page.getByLabel('Heure de fin').fill('13:00')
  await expect(page.getByText('Durée : 5 h 00')).toBeVisible()
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page.getByText('Activité enregistrée')).toBeVisible()
  await expect(lignesActivites(page).first()).toContainText('nette 5 h 00')
  await expect(lignesActivites(page).first()).toContainText('5,00 €')

  // Suppression, avec confirmation dans une boîte de dialogue de l'application.
  await lignesActivites(page).first().click()
  await page.getByRole('button', { name: 'Supprimer' }).click()
  const dialogue = page.getByRole('alertdialog')
  await expect(dialogue).toContainText('Supprimer cette activité ?')
  await dialogue.getByRole('button', { name: 'Supprimer' }).click()

  await expect(page.getByText('Activité supprimée')).toBeVisible()
  await expect(page.getByText('Aucune activité ce mois-ci')).toBeVisible()
})

test('e) navigation entre mois et filtre par nature', async ({ page }) => {
  await saisirActivite(page, astreinteMatin)
  await saisirActivite(page, {
    nature: 'Intervention',
    dateDebut: '2026-06-27',
    heureDebut: '14:00',
    heureFin: '15:00',
  })
  await expect(lignesActivites(page)).toHaveCount(2)

  // Mois suivant : vide. Retour au mois précédent : les deux activités.
  await page.getByRole('button', { name: 'Mois suivant' }).click()
  await expect(page.getByRole('heading', { name: 'juillet 2026' })).toBeVisible()
  await expect(page.getByText('Aucune activité ce mois-ci')).toBeVisible()
  await page.getByRole('button', { name: 'Mois précédent' }).click()
  await expect(page.getByRole('heading', { name: 'juin 2026' })).toBeVisible()
  await expect(lignesActivites(page)).toHaveCount(2)

  // Filtre : une seule ligne, totaux inchangés (mois entier).
  const totaux = page.getByRole('region', { name: 'Totaux du mois' })
  await expect(totaux).toContainText('14,00 €')
  await page.getByLabel('Nature').selectOption({ label: 'Intervention' })
  await expect(lignesActivites(page)).toHaveCount(1)
  await expect(lignesActivites(page).first()).toContainText('Intervention')
  await expect(totaux).toContainText('14,00 €')

  // Le mois et le filtre sont conservés au retour d'un autre écran.
  await lignesActivites(page).first().click()
  await expect(page.getByRole('heading', { name: 'Modifier l’activité' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'juin 2026' })).toBeVisible()
  await expect(page.getByLabel('Nature')).toHaveValue(/.+/)
  await expect(lignesActivites(page)).toHaveCount(1)
})

test('paramètres d’adresse invalides : mois en cours et filtre « Toutes »', async ({ page }) => {
  await page.goto('/activites?mois=pas-un-mois&nature=inconnue')

  const moisEnCours = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(new Date())
  await expect(page.getByRole('heading', { name: moisEnCours })).toBeVisible()
  await expect(page.getByLabel('Nature')).toHaveValue('')
})

test('doublon exact : avertissement, puis « Enregistrer quand même »', async ({ page }) => {
  const intervention = {
    nature: 'Intervention',
    dateDebut: '2026-06-26',
    heureDebut: '08:00',
    heureFin: '08:45',
  }
  await saisirActivite(page, intervention)
  await expect(lignesActivites(page)).toHaveCount(1)

  await saisirActivite(page, intervention)
  const dialogue = page.getByRole('alertdialog')
  await expect(dialogue).toContainText('Une activité identique existe déjà.')

  // « Annuler » : rien n'est enregistré, la saisie est conservée.
  await dialogue.getByRole('button', { name: 'Annuler' }).click()
  await expect(page.getByLabel('Heure de fin')).toHaveValue('08:45')

  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Enregistrer quand même' }).click()

  await expect(page.getByText('Activité enregistrée')).toBeVisible()
  await expect(lignesActivites(page)).toHaveCount(2)
})

test('astreinte de nuit : la date de fin passe au lendemain, la durée s’affiche en direct', async ({
  page,
}) => {
  await page.getByRole('link', { name: 'Nouvelle activité' }).click()
  // Nuit du passage à l'heure d'hiver : 13 h réelles.
  await remplirActivite(page, {
    nature: 'Astreinte',
    dateDebut: '2026-10-24',
    heureDebut: '20:00',
    heureFin: '08:00',
  })

  await expect(page.getByLabel('Date de fin')).toHaveValue('2026-10-25')
  await expect(page.getByText('Durée : 13 h 00')).toBeVisible()

  await page.getByRole('button', { name: 'Enregistrer' }).click()

  // Retour à la liste sur le mois de l'activité.
  await expect(page).toHaveURL(/\/activites\?mois=2026-10$/)
  await expect(lignesActivites(page).first()).toContainText(
    'sam. 24/10/2026 20:00 – dim. 25/10/2026 08:00',
  )
  await expect(lignesActivites(page).first()).toContainText('nette 13 h 00')
})

test('une activité introuvable affiche un message et un retour à la liste', async ({ page }) => {
  await page.goto('/activites/00000000-0000-4000-8000-000000000000')

  await expect(page.getByText('Activité introuvable')).toBeVisible()
  await page.getByRole('link', { name: 'Retour à la liste' }).click()
  await expect(page.getByRole('heading', { name: 'Activités', exact: true })).toBeVisible()
})
