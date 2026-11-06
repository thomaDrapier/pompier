import { useSyncExternalStore } from 'react'

// Abonnement aux événements du navigateur : « offline » à la perte du réseau,
// « online » à son retour. La fonction renvoyée retire les écouteurs.
function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

// État courant lu à chaque événement.
function getSnapshot() {
  return navigator.onLine
}

// Hors-ligne non pris en charge en v1 (cahier des charges, section 2) :
// sans réseau, l'application affiche un message clair (section 5).
export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot)

  if (isOnline) return null

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
