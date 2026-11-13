import { QueryClient } from '@tanstack/react-query'

// Client TanStack Query unique de l'application : il garde en mémoire les
// données lues dans Supabase, évite les requêtes répétées et relance les
// lectures concernées après chaque écriture.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Une donnée lue il y a moins de 30 secondes n'est pas redemandée.
      staleTime: 30_000,
      retry: 1,
    },
  },
})
