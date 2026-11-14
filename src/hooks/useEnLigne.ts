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

// Vrai tant que le navigateur a une connexion réseau. Hors ligne, rien ne peut
// être chargé ni enregistré (cahier des charges, section 5).
export function useEnLigne(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
