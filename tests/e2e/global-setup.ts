// Préparation des tests de parcours : un compte FICTIF (@example.test) est créé
// par signUp avec la clé publique, puis supprimé à la fin de tous les tests
// (la fonction renvoyée sert de « teardown » à Playwright).
// Ses identifiants sont transmis aux tests par des variables d'environnement.

import { connexionBase, creerCompte, supprimerComptes } from '../helpers/comptes.ts'

export default async function globalSetup(): Promise<() => Promise<void>> {
  const compte = await creerCompte('e2e')
  process.env.E2E_EMAIL = compte.email
  process.env.E2E_MOT_DE_PASSE = compte.motDePasse

  return async () => {
    const base = await connexionBase()
    try {
      await supprimerComptes(base, [compte.id])
    } finally {
      await base.end()
    }
  }
}
