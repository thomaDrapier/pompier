# Avancement du projet

> Point de reprise de toute nouvelle conversation (projet Claude ou Claude Code) : lire « État actuel », puis la fin du journal. « État actuel » est réécrit à chaque mise à jour ; le journal ne fait que s'allonger

## État actuel (mis à jour le 06/11/2026)
- **En cours** : J0 · étape 0.3 — migration 0001. Non commencée.
- **Dernière étape terminée** : J0 · étape 0.2 — socle d'interface (Tailwind CSS v4, alias @/, shadcn/ui avec Button, vite-plugin-pwa : manifeste, icônes provisoires, service worker en precache seul ; bandeau « Pas de connexion réseau » ; page temporaire). PWA installable vide, testée sur poste dans Chrome.
- **Prochaine action** : valider dans le projet Claude le plan de l'étape 0.3.
- **En attente** :
  - Décision sur le critère « score PWA Lighthouse » (cahier des charges section 9) : la catégorie PWA a été retirée de Lighthouse.
  - Test de la PWA sur smartphone (HTTPS requis), cahier des charges section 11.
  - Répartition de la durée nette entre astreintes qui se chevauchent, cahier des charges section 11, à trancher avant le J1.
- **Branches ouvertes** : feat/j0-2-pwa (jusqu'à fusion).

## Journal

### 06/11/2026 — J0 · étape 0.2 terminée
- **Fait** : Tailwind CSS v4 (plugin Vite) ; alias d'import @/ ; shadcn/ui (Radix, preset Nova) et composant Button ; vite-plugin-pwa (manifeste « SPV Activités », icônes générées depuis public/logo.svg, service worker autoUpdate limité au precache de l'interface, aucune mise en cache des appels Supabase) ; composant OfflineBanner ; page temporaire « en construction » ; fichiers de démonstration Vite supprimés.
- **Branche** : feat/j0-2-pwa
- **Décisions liées** : aucune

### 06/11/2026 — Méthode : suivi de l'avancement
- **Fait** : création de docs/avancement.md ; cahier des charges v1.4 ; CLAUDE.md mis à jour.
- **Branche** : docs/avancement
- **Décisions liées** : D-007

### 05/11/2026 — Méthode : organisation et documentation
- **Fait** : journal des décisions créé ; cahier des charges converti en Markdown (v1.3), PDF v1.2 archivé ; CLAUDE.md réécrit ; application déplacée à la racine du dépôt.
- **Branche** : docs/cahier-markdown
- **Décisions liées** : D-003, D-004, D-005, D-006

### 05/11/2026 — J0 · étape 0.1 terminée
- **Fait** : projet Vite React TypeScript, CLI Supabase en dépendance de développement, Supabase local lancé, .env.local (clé publishable), CLAUDE.md et cahier des charges dans le dépôt.
- **Branche** : main (avant la mise en place de la règle des branches)
- **Décisions liées** : D-002, D-003, D-004

### 03/11/2026 — Cahier des charges v1.2
- **Fait** : plan de livraison précisé (J0 en quatre étapes, moteur de calcul en tête du J1), environnement de développement, gestion des clés.
- **Branche** : —
- **Décisions liées** : D-001, D-002
