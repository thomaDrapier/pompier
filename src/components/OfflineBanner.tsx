import { useEnLigne } from '@/hooks/useEnLigne'

// Hors-ligne non pris en charge en v1 (cahier des charges, section 2) :
// sans réseau, l'application affiche un message clair (section 5).
export function OfflineBanner() {
  const enLigne = useEnLigne()

  if (enLigne) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 bg-destructive px-4 py-2 text-center text-sm font-medium text-white"
    >
      Pas de connexion réseau. Les données ne peuvent être ni chargées ni
      enregistrées.
    </div>
  )
}
