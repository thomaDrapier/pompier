# Avancement du projet

> Point de reprise de toute nouvelle conversation (projet Claude ou Claude Code) : lire « État actuel », puis la fin du journal. « État actuel » est réécrit à chaque mise à jour ; le journal ne fait que s'allonger

## État actuel (mis à jour le 13/11/2026)
- **En cours** : aucune étape. J1 · étape 1.1 terminée.
- **Dernière étape terminée** : J1 · étape 1.1 — moteur de calcul pur `src/engine/` (plages semi-ouvertes, durée nette d'astreinte, détection des chevauchements d'astreintes, résolution du grade et du taux à la date de Paris, montant en centimes, statuts et totaux) et ses tests Vitest (82 tests du moteur, 85 au total). Aucune interface, aucune migration.
- **Prochaine action** : J1 · étape 1.2a (données : trigger D-010, seed fictif, passage base → moteur, hooks TanStack Query), puis 1.2b (écrans) après rédaction des spécifications des écrans de saisie et de liste.
- **En attente** :
  - Décision sur le critère « score PWA Lighthouse » (cahier des charges section 9) : la catégorie PWA a été retirée de Lighthouse.
  - Test de la PWA sur smartphone (HTTPS requis), cahier des charges section 11.
  - Désactiver l'inscription publique en production (J4) : `enable_signup` est gardé actif en local, car les tests créent leurs comptes par signUp.
  - Intégration continue GitHub Actions à envisager (lint, build, tests).
- **Branches ouvertes** : aucune.

## Journal

### 13/11/2026 — Décisions : routeur et niveau de finition de l'interface
- **Fait** : D-013 (React Router) et D-014 (interface fonctionnelle minimale, design reporté) consignées ; cahier des charges v1.7 (sections 6 et 8) ; CLAUDE.md mis à jour.
- **Branche** : docs/d013-d014-interface
- **Décisions liées** : D-013, D-014

### 13/11/2026 — J1 · étape 1.1 terminée
- **Fait** : moteur de calcul pur dans `src/engine/`, sans import de React, de Supabase ni de `src/types/database.ts` : `types.ts` (types d'entrée et de résultat propres au moteur), `intervalles.ts` (union, intersection, soustraction, durée sur des plages semi-ouvertes en millisecondes UTC), `astreintes.ts` (durée nette, détection des astreintes qui se chevauchent), `taux.ts` (date calendaire en Europe/Paris, grade et taux en vigueur), `remuneration.ts` (montant en centimes entiers, demi vers le haut), `index.ts` (`calculerActivites`, `totaliser` avec astreintes à part et détail par nature) ; `aides-test.ts` (instants en heure de Paris pour les tests) ; un fichier de tests par module, 82 tests couvrant les 13 cas demandés, plus le cas miroir de la frontière de fuseau (01/01 à 00:30 à Paris). Dépendances `date-fns` et `@date-fns/tz` ajoutées. Tests du moteur vérifiés aussi sous un autre fuseau machine ; `npm run test`, `npm run build` et `npm run lint` sans erreur. Aucun taux en dur (taux fictifs dans les tests uniquement).
- **Branche** : feat/j1-1-engine
- **Décisions liées** : D-010, D-011, D-012

### 13/11/2026 — Décisions : précisions du moteur de calcul
- **Fait** : D-011 (statuts, anomalies, totaux) et D-012 (conventions techniques) consignées ; cahier des charges v1.6 (section 3.5).
- **Branche** : docs/d011-d012-moteur
- **Décisions liées** : D-011, D-012

### 13/11/2026 — Décision : chevauchement de deux astreintes
- **Fait** : D-010 consignée ; cahier des charges v1.5 (sections 3.2, 3.4, 9, 11, 13).
- **Branche** : docs/d010-chevauchement-astreintes
- **Décisions liées** : D-010

### 07/11/2026 — J0 · étape 0.4 terminée (J0 terminé)
- **Fait** : types `src/types/database.ts` régénérés par `npx supabase gen types typescript --local` (remplacent la version écrite à la main en 0.3 ; aucun écart de colonne, de type ni de nullabilité ; fichier figé en LF par `.gitattributes`) ; client Supabase typé (`src/lib/supabase.ts`, clé publishable seule) ; AuthProvider et useAuth (session, chargement, retour par le lien de réinitialisation) ; écrans connexion, mot de passe oublié, nouveau mot de passe et écran connecté temporaire (shadcn/ui Input, Label, Card), sans routeur ; `supabase/config.toml` (URLs de redirection 5173 et 4173, mot de passe de 8 caractères minimum) ; Vitest (3 tests de l'écran de connexion) ; tests RLS automatisés (32 cas, `tests/rls/`) remplaçant `supabase/tests/verification_0_3.sql`, supprimé ; Playwright (6 parcours × ordinateur et Pixel 7) ; README (Tests, Créer un compte en local, génération des types). Réinitialisation du mot de passe vérifiée de bout en bout avec Mailpit.
- **Branche** : feat/j0-4-auth-tests
- **Décisions liées** : D-008, D-009

### 07/11/2026 — Décisions techniques de l'étape 0.3
- **Fait** : consignation dans docs/decisions.md des choix techniques de la migration 0001 (promotion du premier administrateur et protection du rôle ; aucun droit pour le rôle anon).
- **Branche** : docs/decisions-j0-3
- **Décisions liées** : D-008, D-009

### 07/11/2026 — J0 · étape 0.3 terminée
- **Fait** : migration `supabase/migrations/20261107135551_init_schema.sql` (6 tables de la section 7, fin > début, unicité des taux par grade, nature et date d'effet, clés étrangères en restrict vers le référentiel, index sur (user_id, debut) et sur les clés étrangères, trigger modifie_le, fonction is_admin(), création automatique du profil à l'inscription, protection de role / actif, RLS sur les 6 tables, aucun droit pour anon) ; types `src/types/database.ts` écrits au format de `supabase gen types` (Docker indisponible dans l'environnement de Claude Code, à régénérer par le porteur) ; script `supabase/tests/verification_0_3.sql` ; section « Base de données » du README. Aucun seed.
- **Branche** : feat/j0-3-database
- **Décisions liées** : aucune (choix techniques à consigner, voir « En attente »)

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
