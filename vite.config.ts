import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Une nouvelle version déployée est installée et activée sans action de l'utilisateur.
      registerType: 'autoUpdate',
      manifest: {
        name: 'SPV Activités',
        short_name: 'SPV',
        description:
          'Suivi des activités et des indemnités des sapeurs-pompiers volontaires',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#171717',
        background_color: '#ffffff',
        // Icônes générées par « npm run generate-pwa-assets » (voir pwa-assets.config.ts)
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache : uniquement les fichiers de l'interface produits par le build.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Supprime les caches laissés par les versions précédentes de l'application.
        cleanupOutdatedCaches: true,
        // Volontairement AUCUN runtimeCaching : les appels à Supabase (données, montants,
        // authentification) ne sont jamais mis en cache. Hors-ligne exclu de la v1
        // (cahier des charges, section 2).
      },
    }),
  ],
  resolve: {
    alias: {
      // « @/ » désigne le dossier src/ (même alias que dans tsconfig.app.json)
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
