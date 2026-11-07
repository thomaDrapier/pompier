import { defineConfig, devices } from '@playwright/test'

// Tests de parcours (npm run test:e2e) : l'application BUILDÉE (comme en
// production, service worker compris) est servie par « vite preview » sur le
// port 4173 et pilotée dans Chromium, en format ordinateur et smartphone.
// Prérequis : Supabase local démarré (npx supabase start) et .env.local rempli.
const URL_APPLICATION = 'http://localhost:4173'

export default defineConfig({
  testDir: './tests/e2e',
  // Création du compte fictif avant les tests, suppression après.
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: URL_APPLICATION,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: URL_APPLICATION,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
