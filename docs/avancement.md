# Avancement du projet

> Point de reprise de toute nouvelle conversation (projet Claude ou Claude Code) : lire « État actuel », puis la fin du journal. « État actuel » est réécrit à chaque mise à jour ; le journal ne fait que s'allonger

## État actuel (mis à jour le 17/11/2026)
- **En cours** : aucune étape. J2 terminé.
- **Dernière étape terminée** : J2 · étape 2.3 — écran Paramètres (grade et historique de grades, taux du grade, compte). J2 terminé.
- **Prochaine action** : J3 · Restitutions : plan et spécifications à préparer dans le projet Claude, en commençant par le point en attente « identification des interventions ».
- **En attente** :
  - Décision sur le critère « score PWA Lighthouse » (cahier des charges section 9) : la catégorie PWA a été retirée de Lighthouse.
  - Test de la PWA sur smartphone (HTTPS requis), cahier des charges section 11.
  - J4 : garantir que le seed et ses comptes de test (`demo@example.com` et l'administrateur `admin@example.com`) ne sont jamais appliqués en production.
  - J4 : l'hébergeur statique doit renvoyer index.html pour toute adresse (routage côté navigateur).
  - Identification des interventions (mise en avant, nombre d'interventions de l'accueil) : aucun indicateur dans le modèle ; à trancher avant le J3.
  - Désactiver l'inscription publique en production (J4) : `enable_signup` est gardé actif en local, car les tests créent leurs comptes par signUp.
  - Intégration continue GitHub Actions à envisager (lint, build, tests).
  - J3 (étape 3.1) : jeu de démonstration pour `demo@example.com` — activités fictives sur les 3 mois précédents et le mois en cours, dates relatives à la date de recréation de la       base, cas variés (astreintes nuit/week-end, interventions pendant et hors astreinte, activités à cheval sur deux semaines et deux mois, changement d'heure, promotion de grade,       taux manquant).
- **Branches ouvertes** : aucune.

## Journal

### 17/11/2026 — J2 · étape 2.3 terminée : écran Paramètres (J2 terminé)
- **Fait** : écran Paramètres `/parametres` (`src/features/parametres/ParametresScreen.tsx`), entrée « Paramètres » du menu entre « Activités » et « Administration », visible pour tout utilisateur connecté (`src/components/EnTete.tsx`, `src/App.tsx`, `src/routes/adresses.ts`). Mon grade : grade actuel ou « Aucun grade renseigné… », historique du plus récent au plus ancien (« Actuel », « À venir », « Archivé »), ajout (grades actifs, date du jour par défaut), correction (grade archivé conservable), suppression, confirmations de D-021 et doublon de date (D-028). Taux de mon grade en lecture seule, une ligne par nature active. Compte : e-mail en lecture seule, « Changer le mot de passe » par le lien de réinitialisation existant (`src/features/auth/reinitialisation.ts`, partagé avec « Mot de passe oublié », même `redirectTo`). Règles en fonctions pures (`regles-parametres.ts` : date à confirmer, contrôle du formulaire, grades proposés, messages). Mutualisation : éléments d'interface communs déplacés dans `src/components/communs.tsx`, messages communs dans `src/lib/messages.ts`, textes des taux (« depuis le », « à partir du ») dans `src/data/affichage-referentiel.ts`, lecture de Mailpit dans `tests/e2e/aides.ts`. Invalidations de D-029 vérifiées : après l'ajout d'un grade, la liste des activités se recalcule sans rechargement (test e2e b). README : le grade se renseigne dans Paramètres, plus dans le Studio. Tests : `npm run test` (285), `npm run test:rls` (81), `npm run test:e2e` (68, dont 16 nouveaux dans `tests/e2e/parametres.spec.ts`, parcours a à h sur ordinateur et Pixel 7), `npm run lint` et `npm run build` sans erreur. Vérification visuelle sur téléphone simulé (375 × 812).
- **Branche** : feat/j2-3-parametres
- **Décisions liées** : D-016, D-017, D-018, D-021, D-028, D-029, D-031 (choix techniques de l'étape, consignée par la branche docs/d031-parametres)

### 17/11/2026 — J2 · étape 2.2 terminée : écrans d'administration
- **Fait** : menu de navigation dans l'en-tête (`src/components/EnTete.tsx` : « Activités », « Administration » pour l'administrateur seulement). Routes `/admin` (redirige vers `/admin/grades`), `/admin/grades`, `/admin/natures`, `/admin/taux` (`src/App.tsx`, `src/routes/adresses.ts`), reliées par des onglets ; garde d'accès (`src/features/admin/AdministrationLayout.tsx` : chargement, puis « Accès réservé à l'administrateur » et « Retour aux activités »). Écrans `GradesScreen.tsx`, `NaturesScreen.tsx` (case « Est une astreinte » grisée selon `nature_utilisee`, avec l'explication de D-022), `TauxScreen.tsx` (grade dans l'adresse, une ligne par nature, historique d'un couple, nouveau taux, correction et suppression avec les confirmations de D-019 et D-020). Contrôles des formulaires en fonctions pures (`regles-admin.ts`), messages des spécifications et traduction des erreurs (`messages.ts`), éléments communs (`communs.tsx`) ; formats `formaterTaux` et `formaterJour` (`src/lib/formats.ts`). Saisie d'une activité : nature archivée signalée « (Archivée) » et conservée en modification ; filtre de la liste : toutes les natures, archivées signalées. Seed : compte administrateur fictif `admin@example.com` ; README (seed, adresses, tests). Tests : `npm run test` (270), `npm run test:rls` (81), `npm run test:e2e` (52, dont 14 nouveaux dans `tests/e2e/administration.spec.ts`, parcours a à f sur ordinateur et Pixel 7), `npm run lint` et `npm run build` sans erreur. Vérification visuelle sur téléphone simulé (375 × 812). Aucun écran Paramètres (étape 2.3).
- **Branche** : feat/j2-2-admin
- **Décisions liées** : D-014, D-016, D-018, D-019, D-020, D-022, D-023, D-024, D-026, D-027, D-030 (choix techniques de l'étape, consignée par la branche docs/d030-ecrans-admin)

### 17/11/2026 — J2 · étape 2.1 terminée : données du référentiel
- **Fait** : migration `supabase/migrations/20261117120000_referentiel_j2.sql` : colonne `grades.actif` ; unicités insensibles à la casse (index sur `lower(...)`, archivés compris) du libellé des grades, du libellé et du code des natures ; contraintes du taux positif ou nul, de l'unicité des taux et de la date d'effet unique de l'historique de grades renommées (elles existaient depuis la migration 0001) ; trigger de verrou de « est une astreinte » (code `SPV01`, message `est_astreinte_verrouille`) et fonction `nature_utilisee()`, tous deux en `security definer` ; RLS vérifiée, sans modification. Seed vérifié : il respecte toutes les contraintes, sans changement. Moteur (`src/engine/taux.ts`) : règle de la ligne en vigueur extraite dans `ligneEnVigueur` (réutilisée par `gradeEnVigueur` et `tauxEnVigueur`), fonctions `prochaineLigne`, `statutLigne`, `estDateEffetPassee`, `tauxDuCouple` ; test du taux nul (statut « ok », montant nul, durées comptées). Données : `src/data/requetes-referentiel.ts` (grades, natures, taux, historique de grades, profil), `src/data/affichage-referentiel.ts` (taux en vigueur et prochain taux, statuts, grade à une date), erreurs typées dans `src/data/erreurs.ts` (`ErreurDoublon`, `ErreurDejaServi`, `ErreurAstreinteVerrouillee`, `ErreurTauxNegatif`), clés dans `src/data/cles.ts`. Hooks : `useAdministrationReferentiel.ts`, `useEcritureHistoriqueGrades.ts`, `useProfil.ts`, `invalidation.ts` (référentiel et calculs de période invalidés après chaque écriture). Types régénérés (`src/types/database.ts`) ; README, section « Base de données ». Tests : `npm run test` (234), `npm run test:rls` (81, dont `tests/rls/referentiel.test.ts`), `npm run test:e2e` (38), `npm run lint` et `npm run build` sans erreur ; libellés des natures de test suffixés pour respecter D-026. Aucun écran (étapes 2.2 et 2.3).
- **Branche** : feat/j2-1-donnees
- **Décisions liées** : D-018, D-022, D-023, D-024, D-026, D-027, D-028, D-029 (choix techniques de l'étape, consignée par la branche docs/d029-donnees-referentiel)

### 17/11/2026 — J2 · étape 2.0 terminée : spécifications des écrans v1.2
- **Fait** : docs/specifications_ecrans.md v1.2 (navigation et accès réservé, Paramètres, Administration › Grades, Natures, Grille de taux ; natures archivées dans la saisie).
- **Branche** : docs/specifications-ecrans-v1-2
- **Décisions liées** : D-017 à D-028

### 17/11/2026 — Décision : date d'effet unique dans l'historique de grades
- **Fait** : D-028 consignée ; cahier des charges v1.18 (sections 3.7, 7, 13).
- **Branche** : docs/d028-date-effet-grade
- **Décisions liées** : D-028

### 17/11/2026 — Décision : taux horaire nul
- **Fait** : D-027 consignée ; cahier des charges v1.17 (sections 3.5, 7, 13).
- **Branche** : docs/d027-taux-nul
- **Décisions liées** : D-027

### 17/11/2026 — Décision : unicité du libellé des natures
- **Fait** : D-026 consignée ; cahier des charges v1.16 (sections 3.3, 7, 13).
- **Branche** : docs/d026-libelle-nature
- **Décisions liées** : D-026

### 17/11/2026 — Décisions : libellé des grades et fusion par Claude Code
- **Fait** : D-024 et D-025 consignées ; cahier des charges v1.15 (sections 3.6, 7, 12.2, 12.3, 13) ; CLAUDE.md (section Git).
- **Branche** : docs/d024-d025-libelle-grade-fusion
- **Décisions liées** : D-024, D-025

### 15/11/2026 — Décision : code des natures
- **Fait** : D-023 consignée ; cahier des charges v1.13 (sections 3.3, 7, 13).
- **Branche** : docs/d023-code-nature
- **Décisions liées** : D-023

### 15/11/2026 — Décision : verrouillage de « est une astreinte »
- **Fait** : D-022 consignée ; cahier des charges v1.12 (sections 3.3, 13).
- **Branche** : docs/d022-verrou-astreinte
- **Décisions liées** : D-022

### 15/11/2026 — Décisions : gestion des lignes de taux et portée des dates d'effet
- **Fait** : D-019, D-020 et D-021 consignées ; cahier des charges v1.11 (sections 3.5, 3.6, 13) ; CLAUDE.md (règle des taux à date d'effet).
- **Branche** : docs/d019-d020-taux
- **Décisions liées** : D-019, D-020, D-021

### 15/11/2026 — Décision : suppression et archivage du référentiel
- **Fait** : D-018 consignée ; cahier des charges v1.10 (sections 3.3, 3.6, 7, 13).
- **Branche** : docs/d018-archivage-referentiel
- **Décisions liées** : D-018

### 15/11/2026 — Décision : périmètre du J2
- **Fait** : D-017 consignée ; cahier des charges v1.9 (sections 10, 11, 13).
- **Branche** : docs/d017-perimetre-j2
- **Décisions liées** : D-017

### 14/11/2026 — J1 · étape 1.2b terminée (J1 terminé)
- **Fait** : React Router (`src/App.tsx`, `src/routes/`) : adresses `/connexion`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe`, `/activites`, `/activites/nouvelle`, `/activites/:id` ; routes protégées avec retour à l'adresse demandée ; le retour par le lien de réinitialisation passe avant toute redirection et reste actif après un rechargement de la page (récupération notée dans le stockage du navigateur, `AuthProvider`) ; écran connecté temporaire du J0 supprimé, en-tête avec déconnexion. Liste des activités (`src/features/activites/ListeActivitesScreen.tsx`) : mois et filtre dans l'adresse, paramètres invalides ignorés, totaux et bandeau d'anomalie sur le mois entier, lignes filtrées, états de chargement, d'erreur et de mois vide. Saisie / modification (`FormulaireActiviteScreen.tsx`) : valeurs par défaut, date et heure en champs natifs séparés, fin au lendemain, durée en direct, contrôles bloquants (champs, fin ≤ début, chevauchement d'astreintes côté client et erreur de la base), avertissements (doublon, chevauchement hors astreinte) dans une boîte de dialogue, suppression confirmée, activité introuvable. Fonctions pures testées : `src/lib/formats.ts`, `src/lib/temps.ts`, `regles-saisie.ts`, `etat-formulaire.ts`. Données : `lireActivite`, `lireDerniereActivite`, `lireActivitesChevauchant`, hooks `useActivite`, `useDerniereActivite`, `useEnLigne`. Composants shadcn/ui `alert-dialog`, `badge`, `textarea` ; dépendance `react-router`. Tests : `npm run test` (182), `npm run test:rls` (46), `npm run test:e2e` (38 : parcours a à g sur ordinateur et Pixel 7, dont la réinitialisation complète via Mailpit), `npm run build` et `npm run lint` sans erreur. Vérification manuelle sur téléphone simulé (375 × 812) : une saisie demande trois gestes (ouvrir le formulaire, saisir l'heure de fin, enregistrer), nature, début et date de fin étant préremplis ; l'enregistrement et le retour à la liste prennent environ une seconde.
- **Branche** : feat/j1-2b-ecrans
- **Décisions liées** : D-010, D-011, D-013, D-014, D-015, D-016 (choix techniques de l'étape, consignée par la branche docs/d016-ecrans)

### 14/11/2026 — Spécifications des écrans v1.1
- **Fait** : docs/specifications_ecrans.md v1.1, précisions issues du plan de l'étape 1.2b (en-tête, conservation du mois et du filtre, totaux non filtrés, messages, champs date et heure séparés, valeurs par défaut, fin au lendemain, chevauchements multiples, astreinte en anomalie, activité introuvable) ; point J4 sur l'hébergement ajouté à « En attente ».
- **Branche** : docs/specifications-ecrans-v1-1
- **Décisions liées** : D-010, D-013, D-014

### 14/11/2026 — Spécifications des écrans du J1
- **Fait** : création de docs/specifications_ecrans.md v1.0 (règles communes, liste des activités, saisie / modification) ; cahier des charges v1.8 (section 6.3).
- **Branche** : docs/specifications-ecrans-j1
- **Décisions liées** : D-010, D-011, D-014, D-015

### 14/11/2026 — J1 · étape 1.2a terminée
- **Fait** : migration `supabase/migrations/20261113235000_chevauchement_astreintes.sql` (trigger `before insert or update` sur `activities`, `security invoker`, verrou transactionnel par utilisateur, erreur de code `23P01` et de message `chevauchement_astreintes`, astreintes contiguës acceptées) ; `tests/rls/chevauchement-astreintes.test.ts` (11 tests : les 9 cas demandés, dont les insertions simultanées et l'insertion au nom d'un autre utilisateur) ; `supabase/seed.sql` (6 natures, 3 grades, grille de taux FICTIFS à deux dates d'effet, compte de test `demo@example.com` avec historique de grade), documenté dans le README ; `src/data/` : `conversions.ts` (lignes de la base → types du moteur, taux en centimes avec tolérance), `periode.ts` (enveloppe de calcul et lecture élargie), `calcul.ts` (`calculerPeriode` : moteur sur l'ensemble élargi, résultats et totaux des seules activités qui commencent dans la période), `erreurs.ts` (`ErreurChevauchementAstreintes`, reconnue au code et au message réunis), `requetes.ts`, `cles.ts` ; `src/hooks/` : `useReferentiel`, `useHistoriqueGrades`, `useActivitesPeriode`, `useCalculPeriode`, `useCreerActivite`, `useModifierActivite`, `useSupprimerActivite` ; `QueryClientProvider` dans `src/main.tsx` ; `tests/rls/requetes.test.ts` (requêtes de l'application contre Supabase local) avec `tsconfig.integration.json` et l'alias `@/` dans `vitest.rls.config.ts`. Dépendance `@tanstack/react-query` ajoutée. `npm run test` (115 tests), `npm run test:rls` (46 tests), `npm run build`, `npm run lint` et `npx supabase db reset` sans erreur ; types générés inchangés. Rattachement d'une activité à la période où elle commence : provisoire pour le J1 (hypothèse de 3.8).
- **Branche** : feat/j1-2a-donnees
- **Décisions liées** : D-010, D-011, D-012, D-015 (choix techniques de l'étape, consignée par la branche docs/d015-donnees)

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
