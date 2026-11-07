import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Tests unitaires (npm run test) : composants React et, au J1, moteur de calcul.
// Exécutés dans un DOM simulé (jsdom), sans navigateur ni Supabase.
// Les tests de sécurité (tests/rls/) et de parcours (tests/e2e/) ont leur
// propre configuration.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
