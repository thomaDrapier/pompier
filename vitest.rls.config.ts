import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests de sécurité de la base (npm run test:rls) : exécutés dans Node contre
// Supabase LOCAL, qui doit être démarré (npx supabase start).
export default defineConfig({
  resolve: {
    // Même alias que l'application : tests/rls/requetes.test.ts importe les
    // requêtes de src/data/.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    // Les tests d'un fichier partagent les mêmes comptes : exécution en série.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
