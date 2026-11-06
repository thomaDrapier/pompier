# CLAUDE.md — PWA de suivi des activités et indemnités SPV

## Projet
PWA de suivi des activités des sapeurs-pompiers volontaires : saisie minimaliste
(début, fin, nature), calcul automatique des astreintes nettes et de la rémunération.
Le porteur du projet est aussi l'unique administrateur. Niveau : intermédiaire
(architecte cloud), novice en PWA : expliquer brièvement les choix propres au web/PWA.

## Documents de référence (à lire au début de chaque session)
- `docs/avancement.md` : à lire EN PREMIER (« État actuel », puis la fin du journal) ;
  résumer au porteur où en est le projet et attendre son accord avant de continuer.
- `docs/cahier_des_charges.md` : source de référence unique pour les règles métier,
  le modèle de données, la stack et l'organisation (section 12).
- `docs/decisions.md` : journal des décisions ; les décisions validées complètent le
  cahier des charges. Respecter les règles du journal (en tête du fichier).
- `docs/specifications_ecrans.md` : fait foi pour l'interface (à rédiger).
- En cas d'ambiguïté ou de contradiction : la signaler et demander, ne jamais trancher
  silencieusement (voir section 11 du cahier des charges).
- En cas d'écart entre ce fichier et le cahier des charges, le cahier des charges fait foi.

## Organisation avec le projet Claude
- Le projet Claude (conversation séparée) traite les règles métier et les décisions
  fonctionnelles ; Claude Code traite uniquement le code et la mise à jour des fichiers
  du dépôt.
- Les deux ne communiquent pas directement : le lien passe par le porteur du projet et
  par `CLAUDE.md`, `docs/cahier_des_charges.md`, `docs/decisions.md` et
  `docs/avancement.md`.
- Le projet Claude ne lit QUE la branche `main`, après synchronisation manuelle
  (« Sync now »). Tout ce qui est sur une autre branche lui est invisible.
- Quand le porteur transmet une décision venant du projet Claude : la recopier
  fidèlement dans `docs/decisions.md`, reporter ses effets dans
  `docs/cahier_des_charges.md` (version incrémentée + ligne dans la section 13),
  mettre à jour `docs/avancement.md` et, si besoin, ce fichier, le tout dans une même
  branche `docs/…`.
- Ne jamais prendre seul une décision métier : si une règle métier manque ou est
  ambiguë, s'arrêter et demander au porteur, qui la tranchera dans le projet Claude.
- Consigner toute décision technique notable dans `docs/decisions.md`
  (origine « Claude Code », statut « à valider » si elle a un impact métier).

## Accompagnement et apprentissage
- Le projet sert aussi au porteur à progresser en gestion de projet et en développement
  agentique.
- Avant de coder : présenter les options et une recommandation argumentée, puis
  demander son avis.
- Avancer par petites étapes. Après chaque production, expliquer chaque fichier et
  comment le tester.
- Guider sur les bonnes pratiques (branches, PR, tests, CI, sécurité) au moment où elles
  s'appliquent, et laisser le porteur faire les gestes formateurs.

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
- La clé secret / `service_role` de Supabase n'est JAMAIS côté client.
- Seules `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (qui contient la clé
  publishable) vont dans `.env.local` (non versionné).
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

## Git
- Ne jamais committer directement sur `main`. Une branche par tâche :
  `feat/<jalon>-<sujet>` (ex. `feat/j0-2-pwa`), `fix/<sujet>`, `docs/<sujet>`.
- Toute modification de `CLAUDE.md` ou de `docs/` passe par une branche `docs/…`
  courte, fusionnée dans `main` dès validation, séparément du code.
- En fin de tâche : mettre à jour `docs/avancement.md` (« État actuel » réécrit, entrée
  ajoutée au journal) dans la branche de la tâche, puis commit, push, et demander
  l'accord du porteur avant la fusion dans `main`. Après une fusion qui touche
  `CLAUDE.md` ou `docs/`, rappeler au porteur de cliquer sur « Sync now » dans le
  projet Claude.
- Exception à la règle des branches `docs/…` : `docs/avancement.md` est toujours mis à
  jour dans la branche de la tâche qu'il décrit.

## Style
- Réponses en français, concises.
- TypeScript strict ; règles métier commentées en français dans le code.

## Structure du dépôt
- `src/engine/` : moteur de calcul pur + tests (`*.test.ts`)
- `src/` : application React
- `supabase/migrations/` : migrations SQL
- `tests/e2e/` : tests Playwright
- `docs/` : cahier des charges, journal des décisions, avancement, spécifications des écrans
- `docs/archives/` : anciennes versions figées (PDF)

## Commandes utiles
- `npx supabase start` / `npx supabase stop` : Supabase local (Docker)
- `npx supabase db reset` : recrée la base locale et rejoue toutes les migrations
- `npm run dev` : serveur de développement
- `npm run test` : tests unitaires (Vitest)
- `npm run build && npm run preview` : tester la PWA (le service worker n'est actif
  qu'en build)
