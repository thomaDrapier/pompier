import { Link, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { EtatLecture } from '@/features/admin/communs'
import { MESSAGES } from '@/features/admin/messages'
import { useProfil } from '@/hooks/useProfil'
import { cn } from '@/lib/utils'
import { ADRESSES } from '@/routes/adresses'

const ONGLETS = [
  { adresse: ADRESSES.adminGrades, libelle: 'Grades' },
  { adresse: ADRESSES.adminNatures, libelle: 'Natures' },
  { adresse: ADRESSES.adminTaux, libelle: 'Grille de taux' },
] as const

// Enveloppe des écrans d'administration (spécifications 6.1) : garde d'accès
// et onglets Grades, Natures, Grille de taux (un onglet = une adresse, donc
// le bouton « retour » fonctionne entre eux).
//
// Garde : tant que le profil n'est pas lu, simple chargement (le message de
// refus ne « clignote » jamais pour un administrateur). Un utilisateur qui
// n'est pas administrateur voit « Accès réservé à l'administrateur ».
// Cette garde n'est qu'un confort : la protection est assurée par la base
// (RLS), qui refuse toute écriture du référentiel à un non-administrateur.
export function AdministrationLayout() {
  const profil = useProfil()
  const { pathname } = useLocation()

  if (profil.isPending || profil.isError) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
        <EtatLecture enChargement={profil.isPending} erreur={profil.isError} />
      </main>
    )
  }

  if (!profil.data.estAdmin) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 p-4">
        <p role="alert">{MESSAGES.accesReserve}</p>
        <Button asChild variant="outline">
          <Link to={ADRESSES.activites}>Retour aux activités</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Administration</h1>
      <nav aria-label="Rubriques de l’administration" className="flex gap-1 border-b pb-2">
        {ONGLETS.map((onglet) => {
          const actif = pathname === onglet.adresse
          return (
            <Button
              key={onglet.adresse}
              asChild
              variant="ghost"
              size="sm"
              className={cn(actif && 'bg-muted font-semibold')}
            >
              <Link to={onglet.adresse} aria-current={actif ? 'page' : undefined}>
                {onglet.libelle}
              </Link>
            </Button>
          )
        })}
      </nav>
      <Outlet />
    </main>
  )
}
