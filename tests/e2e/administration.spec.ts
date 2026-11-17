// Parcours de l'administration (J2 · étape 2.2) : menu et garde d'accès,
// Grades, Natures, Grille de taux, natures archivées dans la saisie ; sur
// ordinateur et smartphone.
//
// Tests indépendants et parallélisables : chaque test crée ses propres comptes
// et son propre référentiel FICTIF, dont les libellés et les codes portent un
// suffixe unique, avec un ordre élevé (900 et plus) pour ne jamais devenir le
// « premier grade » ou la « première nature » d'un autre test. Aucun élément
// du seed n'est modifié. Tout est supprimé à la fin du test.

import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import type { CompteTest } from '../helpers/comptes.ts'
import {
  creerCompteAdmin,
  creerCompteAvecGrade,
  dateDuJourParis,
  jourFrancais,
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
  // Les comptes d'abord (cascade : activités, historiques), puis le référentiel.
  for (const compte of comptes) await supprimerCompte(compte)
  await nettoyerReferentiel(suffixe)
})

async function nouvelAdmin(): Promise<CompteTest> {
  const compte = await creerCompteAdmin('e2e-admin')
  comptes.push(compte)
  return compte
}

async function nouvelUtilisateur(): Promise<CompteTest> {
  const compte = await creerCompteAvecGrade('e2e-admin-user')
  comptes.push(compte)
  return compte
}

/** Ouvre une adresse protégée et se connecte : retour à l'adresse demandée. */
async function ouvrir(page: Page, adresse: string, compte: CompteTest): Promise<void> {
  await page.goto(adresse)
  await seConnecter(page, compte.email, compte.motDePasse)
}

function menu(page: Page) {
  return page.getByRole('navigation', { name: 'Menu principal' })
}

function ligne(page: Page, liste: string, texte: string) {
  return page.getByRole('list', { name: liste }).getByRole('listitem').filter({ hasText: texte })
}

async function insererGrade(libelle: string): Promise<string> {
  const r = await requeteSql<{ id: string }>(
    `insert into public.grades (libelle, ordre) values ($1, 950) returning id`,
    [libelle],
  )
  return r.rows[0].id
}

async function insererNature(libelle: string, code: string): Promise<string> {
  const r = await requeteSql<{ id: string }>(
    `insert into public.activity_types (code, libelle, est_astreinte, ordre)
     values ($1, $2, false, 950) returning id`,
    [code, libelle],
  )
  return r.rows[0].id
}

async function insererActivite(userId: string, natureId: string): Promise<string> {
  const r = await requeteSql<{ id: string }>(
    `insert into public.activities (user_id, activity_type_id, debut, fin)
     values ($1, $2, '2026-06-10T08:00:00+02:00', '2026-06-10T10:00:00+02:00') returning id`,
    [userId, natureId],
  )
  return r.rows[0].id
}

test('a) un utilisateur non administrateur ne voit pas « Administration » et reçoit « Accès réservé »', async ({
  page,
}) => {
  const utilisateur = await nouvelUtilisateur()
  await ouvrir(page, '/activites', utilisateur)
  await expect(menu(page).getByRole('link', { name: 'Activités', exact: true })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Administration' })).toHaveCount(0)

  await page.goto('/admin/grades')
  await expect(page.getByText('Accès réservé à l’administrateur')).toBeVisible()
  // Rien du contenu de l'administration n'est affiché.
  await expect(page.getByRole('button', { name: 'Ajouter un grade' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Retour aux activités' }).click()
  await expect(page).toHaveURL(/\/activites$/)
})

test('a) le compte administrateur fictif du seed voit « Administration »', async ({ page }) => {
  await page.goto('/activites')
  await seConnecter(page, 'admin@example.com', 'admin-spv-local')
  await menu(page).getByRole('link', { name: 'Administration' }).click()
  // /admin mène à l'onglet Grades.
  await expect(page).toHaveURL(/\/admin\/grades$/)
  await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible()
})

test('b) grades : ajouter, modifier, archiver, réactiver, supprimer ; doublon de libellé refusé', async ({
  page,
}) => {
  const admin = await nouvelAdmin()
  await ouvrir(page, '/admin', admin)
  await expect(page).toHaveURL(/\/admin\/grades$/)

  const libelle = `E2E Grade ${suffixe}`
  const libelleModifie = `E2E Autre ${suffixe}`

  // Ajouter.
  await page.getByRole('button', { name: 'Ajouter un grade' }).click()
  const ajout = page.getByRole('form', { name: 'Nouveau grade' })
  await ajout.getByLabel('Libellé').fill(`  ${libelle}  `)
  await ajout.getByLabel('Ordre').fill('951')
  await ajout.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Grade ajouté', { exact: true })).toBeVisible()
  await expect(ligne(page, 'Liste des grades', libelle)).toContainText('Ordre : 951')

  // Doublon : même libellé, casse différente.
  await page.getByRole('button', { name: 'Ajouter un grade' }).click()
  const doublon = page.getByRole('form', { name: 'Nouveau grade' })
  await doublon.getByLabel('Libellé').fill(libelle.toUpperCase())
  await doublon.getByLabel('Ordre').fill('952')
  await doublon.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(doublon.getByText('Un grade porte déjà ce libellé.')).toBeVisible()
  // La saisie est conservée.
  await expect(doublon.getByLabel('Libellé')).toHaveValue(libelle.toUpperCase())
  await doublon.getByRole('button', { name: 'Annuler' }).click()

  // Modifier.
  await ligne(page, 'Liste des grades', libelle).getByRole('button', { name: 'Modifier' }).click()
  const modification = page.getByRole('form', { name: 'Modifier le grade' })
  await expect(modification.getByLabel('Libellé')).toHaveValue(libelle)
  await modification.getByLabel('Libellé').fill(libelleModifie)
  await modification.getByLabel('Ordre').fill('953')
  await modification.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Grade modifié', { exact: true })).toBeVisible()
  const grade = ligne(page, 'Liste des grades', libelleModifie)
  await expect(grade).toContainText('Ordre : 953')

  // Archiver puis réactiver, sans confirmation.
  await grade.getByRole('button', { name: 'Archiver' }).click()
  await expect(grade).toContainText('Archivé')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await grade.getByRole('button', { name: 'Réactiver' }).click()
  await expect(grade.getByRole('button', { name: 'Archiver' })).toBeVisible()
  await expect(grade).not.toContainText('Archivé')

  // Supprimer, avec confirmation.
  await grade.getByRole('button', { name: 'Supprimer' }).click()
  const confirmation = page.getByRole('alertdialog')
  await expect(confirmation).toContainText('Supprimer ce grade ?')
  await confirmation.getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByText('Grade supprimé', { exact: true })).toBeVisible()
  await expect(ligne(page, 'Liste des grades', libelleModifie)).toHaveCount(0)
})

test('c) la suppression d’un grade déjà utilisé est refusée', async ({ page }) => {
  const admin = await nouvelAdmin()
  const utilisateur = await nouvelUtilisateur()
  const libelle = `E2E Utilise ${suffixe}`
  const gradeId = await insererGrade(libelle)
  // Le grade n'est utilisé que par l'historique d'un autre utilisateur.
  await requeteSql(
    `insert into public.user_grade_history (user_id, grade_id, date_effet) values ($1, $2, '2026-08-01')`,
    [utilisateur.id, gradeId],
  )

  await ouvrir(page, '/admin/grades', admin)
  await ligne(page, 'Liste des grades', libelle).getByRole('button', { name: 'Supprimer' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click()

  await expect(page.getByText('Ce grade a déjà servi : archivez-le plutôt.')).toBeVisible()
  await expect(ligne(page, 'Liste des grades', libelle)).toHaveCount(1)
})

test('d) natures : ajout, doublon de code refusé, « Est une astreinte » grisée une fois la nature utilisée', async ({
  page,
}) => {
  const admin = await nouvelAdmin()
  const utilisateur = await nouvelUtilisateur()
  const libelle = `E2E Nature ${suffixe}`
  const code = `E2E-${suffixe}`

  await ouvrir(page, '/admin/natures', admin)

  // Ajout.
  await page.getByRole('button', { name: 'Ajouter une nature' }).click()
  const ajout = page.getByRole('form', { name: 'Nouvelle nature' })
  await ajout.getByLabel('Libellé').fill(libelle)
  await ajout.getByLabel('Code').fill(code)
  await ajout.getByLabel('Ordre').fill('951')
  await ajout.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Nature ajoutée', { exact: true })).toBeVisible()
  await expect(ligne(page, 'Liste des natures', libelle)).toContainText(`Code : ${code}`)

  // Doublon de code, casse différente.
  await page.getByRole('button', { name: 'Ajouter une nature' }).click()
  const doublon = page.getByRole('form', { name: 'Nouvelle nature' })
  await doublon.getByLabel('Libellé').fill(`E2E Autre ${suffixe}`)
  await doublon.getByLabel('Code').fill(code.toLowerCase())
  await doublon.getByLabel('Ordre').fill('952')
  await doublon.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(doublon.getByText('Une nature porte déjà ce code.')).toBeVisible()
  await doublon.getByRole('button', { name: 'Annuler' }).click()

  // Nature neuve : la case est modifiable.
  await ligne(page, 'Liste des natures', libelle).getByRole('button', { name: 'Modifier' }).click()
  let modification = page.getByRole('form', { name: 'Modifier la nature' })
  await expect(modification.getByLabel('Est une astreinte')).toBeEnabled()
  await expect(
    modification.getByText('Cette nature a déjà été utilisée.', { exact: false }),
  ).toHaveCount(0)
  await modification.getByRole('button', { name: 'Annuler' }).click()

  // Une activité d'un AUTRE utilisateur utilise la nature : la case est grisée.
  const natureId = (
    await requeteSql<{ id: string }>(`select id from public.activity_types where code = $1`, [code])
  ).rows[0].id
  await insererActivite(utilisateur.id, natureId)

  await page.reload()
  await ligne(page, 'Liste des natures', libelle).getByRole('button', { name: 'Modifier' }).click()
  modification = page.getByRole('form', { name: 'Modifier la nature' })
  await expect(modification.getByLabel('Est une astreinte')).toBeDisabled()
  await expect(
    modification.getByText(
      'Cette nature a déjà été utilisée. Pour changer ce comportement, créez une nouvelle nature et archivez celle-ci.',
    ),
  ).toBeVisible()

  // Le libellé reste modifiable.
  await modification.getByLabel('Libellé').fill(`${libelle} bis`)
  await modification.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Nature modifiée', { exact: true })).toBeVisible()
})

test('e) grille de taux : nouveau taux passé ou futur, correction, suppression, doublon', async ({
  page,
}) => {
  const admin = await nouvelAdmin()
  const gradeId = await insererGrade(`E2E Grille ${suffixe}`)
  const natureLibelle = `E2E Taux ${suffixe}`
  await insererNature(natureLibelle, `E2E-T-${suffixe}`)
  const aujourdhui = dateDuJourParis()
  const futur = `${Number(aujourdhui.slice(0, 4)) + 1}-01-01`

  await ouvrir(page, `/admin/taux?grade=${gradeId}`, admin)
  await expect(page.getByLabel('Grade')).toHaveValue(gradeId)
  const ligneGrille = ligne(page, 'Taux par nature', natureLibelle)
  await expect(ligneGrille).toContainText('Aucun taux')
  await ligneGrille.getByRole('link').click()
  await expect(page.getByRole('heading', { name: `E2E Grille ${suffixe} · ${natureLibelle}` })).toBeVisible()

  // Nouveau taux à la date du jour : date passée, confirmation (D-020).
  await page.getByRole('button', { name: 'Nouveau taux' }).click()
  let formulaire = page.getByRole('form', { name: 'Nouveau taux' })
  await formulaire.getByLabel('Taux (€/h)').fill('12,5')
  await formulaire.getByLabel('Date d’effet').fill(aujourdhui)
  await formulaire.getByRole('button', { name: 'Enregistrer' }).click()
  const confirmation = page.getByRole('alertdialog')
  await expect(confirmation).toContainText(
    `Cette date d’effet est passée : les montants des activités à partir du ${jourFrancais(aujourdhui)} seront recalculés.`,
  )
  await confirmation.getByRole('button', { name: 'Confirmer' }).click()
  await expect(page.getByText('Taux ajouté', { exact: true })).toBeVisible()
  await expect(ligne(page, 'Historique des taux', '12,50 €/h')).toContainText('En vigueur')

  // Nouveau taux futur : pas de confirmation.
  await page.getByRole('button', { name: 'Nouveau taux' }).click()
  formulaire = page.getByRole('form', { name: 'Nouveau taux' })
  await formulaire.getByLabel('Taux (€/h)').fill('13')
  await formulaire.getByLabel('Date d’effet').fill(futur)
  await formulaire.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Taux ajouté', { exact: true })).toBeVisible()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(ligne(page, 'Historique des taux', '13,00 €/h')).toContainText('À venir')

  // Doublon (grade, nature, date d'effet) refusé.
  await page.getByRole('button', { name: 'Nouveau taux' }).click()
  formulaire = page.getByRole('form', { name: 'Nouveau taux' })
  await formulaire.getByLabel('Taux (€/h)').fill('14')
  await formulaire.getByLabel('Date d’effet').fill(futur)
  await formulaire.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(
    formulaire.getByText('Un taux existe déjà pour ce grade, cette nature et cette date d’effet.'),
  ).toBeVisible()
  await formulaire.getByRole('button', { name: 'Annuler' }).click()

  // Correction, avec confirmation (D-019).
  await ligne(page, 'Historique des taux', '13,00 €/h').getByRole('button', { name: 'Corriger' }).click()
  formulaire = page.getByRole('form', { name: 'Corriger le taux' })
  await expect(formulaire.getByLabel('Taux (€/h)')).toHaveValue('13,00')
  await formulaire.getByLabel('Taux (€/h)').fill('13,5')
  await formulaire.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('alertdialog')).toContainText(
    'Cette correction modifie les montants des activités concernées.',
  )
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmer' }).click()
  await expect(page.getByText('Taux corrigé', { exact: true })).toBeVisible()
  await expect(ligne(page, 'Historique des taux', '13,50 €/h')).toContainText('À venir')

  // Suppression, avec confirmation.
  await ligne(page, 'Historique des taux', '13,50 €/h').getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByRole('alertdialog')).toContainText(
    'Les activités concernées reprendront le taux précédent, ou passeront en « taux manquant ».',
  )
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByText('Taux supprimé', { exact: true })).toBeVisible()
  await expect(ligne(page, 'Historique des taux', '13,50 €/h')).toHaveCount(0)

  // Retour à la grille : le taux en vigueur s'affiche.
  await page.getByRole('link', { name: 'Retour à la grille' }).click()
  await expect(ligne(page, 'Taux par nature', natureLibelle)).toContainText(
    `12,50 €/h depuis le ${jourFrancais(aujourdhui)}`,
  )
})

test('f) une nature archivée est absente de la création, conservée en modification', async ({
  page,
}) => {
  const utilisateur = await nouvelUtilisateur()
  const libelle = `E2E Archivee ${suffixe}`
  const natureId = await insererNature(libelle, `E2E-A-${suffixe}`)
  const activiteId = await insererActivite(utilisateur.id, natureId)
  await requeteSql(`update public.activity_types set actif = false where id = $1`, [natureId])

  await ouvrir(page, '/activites/nouvelle', utilisateur)
  await expect(page.getByRole('heading', { name: 'Nouvelle activité' })).toBeVisible()
  const nature = page.getByLabel('Nature')
  await expect(nature.locator('option', { hasText: 'Intervention VSAV' })).toHaveCount(1)
  await expect(nature.locator('option', { hasText: libelle })).toHaveCount(0)

  await page.goto(`/activites/${activiteId}`)
  await expect(page.getByRole('heading', { name: 'Modifier l’activité' })).toBeVisible()
  await expect(nature).toHaveValue(natureId)
  await expect(nature.locator('option:checked')).toHaveText(`${libelle} (Archivée)`)

  // L'activité s'enregistre en gardant sa nature archivée.
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Activité enregistrée')).toBeVisible()
  const relue = await requeteSql<{ activity_type_id: string }>(
    `select activity_type_id from public.activities where id = $1`,
    [activiteId],
  )
  expect(relue.rows[0].activity_type_id).toBe(natureId)
})
