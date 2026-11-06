import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// Génération des icônes de la PWA à partir d'un seul SVG source.
// Commande : npm run generate-pwa-assets (les PNG produits vont dans public/ et sont versionnés).
// Le logo a déjà son fond et sa marge de sécurité : aucune marge ajoutée (padding 0).
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    transparent: {
      ...minimal2023Preset.transparent,
      padding: 0,
    },
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0,
      resizeOptions: { background: '#171717' },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0,
      resizeOptions: { background: '#171717' },
    },
  },
  images: ['public/logo.svg'],
})
