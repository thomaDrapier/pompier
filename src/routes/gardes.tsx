import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { EnTete } from '@/components/EnTete'
import { ConnexionScreen } from '@/features/auth/ConnexionScreen'
import { MotDePasseOublieScreen } from '@/features/auth/MotDePasseOublieScreen'
import { NouveauMotDePasseScreen } from '@/features/auth/NouveauMotDePasseScreen'
import { useAuth } from '@/features/auth/useAuth'
import { ADRESSES, lireEtatNavigation } from '@/routes/adresses'
import type { EtatNavigation } from '@/routes/adresses'

// Gardes des routes : qui peut voir quel écran, et vers où rediriger sinon.

/**
 * Enveloppe de toutes les routes.
 *
 * 1. Tant que la session enregistrée n'a pas été relue, rien n'est décidé.
 * 2. Le retour par le lien de réinitialisation passe AVANT toute autre
 *    redirection : ce lien ouvre une session, qui ne doit jamais mener aux
 *    activités avant que l'utilisateur ait choisi son nouveau mot de passe.
 */
export function Racine() {
  const { session, chargement, recuperationMotDePasse } = useAuth()
  const { pathname } = useLocation()

  if (chargement) {
    return (
      <main className="flex min-h-svh items-center justify-center p-4">
        <p role="status" className="text-muted-foreground">
          Chargement…
        </p>
      </main>
    )
  }

  if (session && recuperationMotDePasse && pathname !== ADRESSES.nouveauMotDePasse) {
    return <Navigate to={ADRESSES.nouveauMotDePasse} replace />
  }

  return <Outlet />
}

/**
 * Écrans réservés aux utilisateurs connectés. Sans session : redirection vers
 * la connexion, en retenant l'adresse demandée pour y revenir ensuite.
 */
export function RouteProtegee() {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    const etat: EtatNavigation = { depuis: `${location.pathname}${location.search}` }
    return <Navigate to={ADRESSES.connexion} replace state={etat} />
  }

  return (
    <>
      <EnTete />
      <Outlet />
    </>
  )
}

/** Adresse où aller après la connexion : celle demandée au départ, sinon la liste. */
function useDestinationApresConnexion(): string {
  const location = useLocation()
  return lireEtatNavigation(location.state).depuis ?? ADRESSES.activites
}

/** Connexion : un utilisateur déjà connecté est envoyé vers sa destination. */
export function PageConnexion() {
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const destination = useDestinationApresConnexion()

  if (session) return <Navigate to={destination} replace />

  return (
    <ConnexionScreen
      // L'adresse demandée au départ est conservée pendant le détour.
      onMotDePasseOublie={() => navigate(ADRESSES.motDePasseOublie, { state: location.state })}
    />
  )
}

/** Mot de passe oublié : un utilisateur déjà connecté n'a rien à y faire. */
export function PageMotDePasseOublie() {
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const destination = useDestinationApresConnexion()

  if (session) return <Navigate to={destination} replace />

  return (
    <MotDePasseOublieScreen
      onRetour={() => navigate(ADRESSES.connexion, { state: location.state })}
    />
  )
}

/**
 * Nouveau mot de passe : accessible seulement après un clic sur le lien de
 * réinitialisation. Une fois le mot de passe enregistré, l'état de
 * récupération se termine et l'utilisateur arrive sur la liste.
 */
export function PageNouveauMotDePasse() {
  const { session, recuperationMotDePasse } = useAuth()

  if (!session) return <Navigate to={ADRESSES.connexion} replace />
  if (!recuperationMotDePasse) return <Navigate to={ADRESSES.activites} replace />

  return <NouveauMotDePasseScreen />
}
