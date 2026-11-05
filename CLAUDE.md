# CLAUDE.md — PWA de suivi des activités et indemnités SPV

## Projet
PWA de suivi des activités des sapeurs-pompiers volontaires : saisie minimaliste
(début, fin, nature), calcul automatique des astreintes nettes et de la rémunération.
Le porteur du projet est aussi l'unique administrateur. Niveau : intermédiaire
(architecte cloud), novice en PWA : expliquer brièvement les choix propres au web/PWA.

## Documents de référence
- `docs/Cahier_des_charges_PWA_SPV_v1.2.pdf` (v1.2) : fait foi pour les règles métier,
  le modèle de données et la stack.
- `docs/Specifications_ecrans.pdf` : fait foi pour l'interface (à ajouter).
- En cas d'ambiguïté ou de contradiction : la signaler et demander, ne jamais trancher
  silencieusement (voir section 11 du cahier des charges).
- En cas d'écart entre ce fichier et le cahier des charges, le cahier des charges fait foi.

## Stack imposée (ne pas en changer sans raison sérieuse)
PostgreSQL via Supabase (Auth, RLS, API) · React + TypeScript strict + Vite ·
vite-plugin-pwa · Tailwind CSS + shadcn/ui · Recharts · TanStack Query ·
date-fns (fuseau Europe/Paris) · Vitest (unitaires) · Playwright (parcours).

## Règles métier non négociables
- Référentiel unique et commun (tables `grades`, `activity_types`, `reference_rates`) :
  aucun taux personnalisé ; seul l'administrateur le modifie.
- Taux à date d'effet : on ajoute une ligne, on n'écrase jamais l'historique.
- Ne JAMAIS coder un taux en dur, ni en inventer un, ni inventer une règle du SDIS.
- Durée nette d'astreinte = durée de (union des astreintes) privée de
  (union de toutes les autres activités, quelle que soit leur nature).
  Pas de double déduction.
- Taux applicable : grade de l'utilisateur à la date de début de l'activité, puis taux
  (grade, nature) en vigueur à cette date ; sinon « taux manquant », activité exclue
  des totaux avec alerte visible.
- Montants et durées nettes : calculés à la lecture, jamais stockés.
- Le moteur de calcul est un module pur (`src/engine/`), sans dépendance à React ni à
  Supabase, écrit une seule fois et couvert par des tests Vitest.
- Fuseau Europe/Paris ; le changement d'heure doit être géré et testé.
- Isolation des données par utilisateur appliquée dans la base (Row Level Security).

## Sécurité
- Aucune clé secrète dans le code, les commits ou les messages.
- La clé `service_role` / secret de Supabase n'est JAMAIS côté client.
- Seules `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` vont dans `.env.local`
  (non versionné).
- Aucune donnée personnelle réelle dans les exemples, jeux de test ou seeds.

## Méthode de travail
- Suivre les jalons J0 à J5 dans l'ordre ; au J1, moteur de calcul et tests AVANT l'interface.
- Avant toute fonctionnalité non triviale : résumer le plan en quelques lignes et
  attendre l'accord.
- Code complet (jamais de « ... »), chemin de chaque fichier, et indication de la
  façon de le tester.
- Migrations SQL versionnées dans `supabase/migrations/` ; respecter exactement les
  noms de tables et de colonnes du cahier des charges.
- Si une information métier manque : poser une seule question à la fois.
- Une branche Git et une Pull Request par étape ; `main` reste toujours fonctionnelle.
  Commits petits, un sujet par commit, messages clairs en français.

## Synchronisation avec le projet Claude
- Le dépôt fait foi. La conception se fait dans le projet Claude (claude.ai),
  l'exécution dans Claude Code.
- Toute décision prise dans le projet Claude est reportée dans `docs/decisions.md`
  (date, décision, raison, alternatives écartées) ou dans ce fichier AVANT d'être codée.
- Si une décision évoquée n'est écrite nulle part dans le dépôt : demander de la reporter,
  ne pas la deviner.

## Accompagnement et apprentissage
Le projet sert aussi au porteur à progresser en gestion de projet et en développement
agentique. Il doit comprendre et valider chaque choix, pas seulement répondre « Oui ».
- Avant de coder : présenter les options, une recommandation argumentée, et demander
  son avis.
- Avancer par petites étapes ; après chaque production, expliquer le rôle de chaque
  fichier, les points clés, et comment le tester soi-même.
- Guider sur les bonnes pratiques au moment où elles s'appliquent : cycle
  cadrer → planifier → réaliser sur une branche → vérifier → relire (Pull Request) →
  fusionner → consigner ; journal des décisions ; tests ; intégration continue ;
  sécurité. Expliquer le « pourquoi » de chaque pratique et laisser le porteur faire
  lui-même les gestes formateurs (relire un diff, ouvrir une PR, lancer les tests).

## Style
- Réponses en français, concises.
- TypeScript strict ; règles métier commentées en français dans le code.

## Structure du dépôt
- `src/engine/` : moteur de calcul pur + tests (`*.test.ts`)
- `src/` : application React
- `supabase/migrations/` : migrations SQL
- `tests/e2e/` : tests Playwright
- `docs/` : cahier des charges, spécifications des écrans, journal des décisions
  (`docs/decisions.md`)

## Commandes utiles
- `npx supabase start` / `npx supabase stop` : Supabase local (Docker)
- `npx supabase db reset` : recrée la base locale et rejoue toutes les migrations
- `npm run dev` : serveur de développement
- `npm run test` : tests unitaires (Vitest)
- `npm run build && npm run preview` : tester la PWA (le service worker n'est actif
  qu'en build)
