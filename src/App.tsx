import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { OfflineBanner } from '@/components/OfflineBanner'
import { FormulaireActiviteScreen } from '@/features/activites/FormulaireActiviteScreen'
import { ListeActivitesScreen } from '@/features/activites/ListeActivitesScreen'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ADRESSES } from '@/routes/adresses'
import {
  PageConnexion,
  PageMotDePasseOublie,
  PageNouveauMotDePasse,
  Racine,
  RouteProtegee,
} from '@/routes/gardes'

// Table des routes (React Router, D-013) : chaque adresse correspond à un
// écran, et le bouton « retour » du navigateur ou du téléphone fonctionne.
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <OfflineBanner />
        <Routes>
          <Route element={<Racine />}>
            {/* Écrans publics */}
            <Route path={ADRESSES.connexion} element={<PageConnexion />} />
            <Route path={ADRESSES.motDePasseOublie} element={<PageMotDePasseOublie />} />
            <Route path={ADRESSES.nouveauMotDePasse} element={<PageNouveauMotDePasse />} />

            {/* Écrans réservés aux utilisateurs connectés */}
            <Route element={<RouteProtegee />}>
              <Route path={ADRESSES.activites} element={<ListeActivitesScreen />} />
              <Route path={ADRESSES.nouvelleActivite} element={<FormulaireActiviteScreen />} />
              <Route path="/activites/:id" element={<FormulaireActiviteScreen />} />
            </Route>

            {/* Racine du site et adresses inconnues : la liste des activités. */}
            <Route path="*" element={<Navigate to={ADRESSES.activites} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
