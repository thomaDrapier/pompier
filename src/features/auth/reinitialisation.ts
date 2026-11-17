import { supabase } from '@/lib/supabase'

/**
 * Demande à Supabase d'envoyer le lien de réinitialisation du mot de passe.
 * Le lien ramène toujours sur la racine du site (redirectTo inchangé, D-016),
 * où l'écran « Nouveau mot de passe » s'affiche.
 *
 * Utilisé par « Mot de passe oublié » (qui n'exploite pas le résultat, pour ne
 * pas révéler si un compte existe) et par « Changer le mot de passe » dans
 * Paramètres (utilisateur connecté : une erreur peut être affichée).
 */
export async function envoyerLienReinitialisation(email: string): Promise<{ erreur: boolean }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
  return { erreur: error !== null }
}
