# Avancement du projet

> Point de reprise de toute nouvelle conversation (projet Claude ou Claude Code) : lire « État actuel », puis la fin du journal. « État actuel » est réécrit à chaque mise à jour ; le journal ne fait que s'allonger

## État actuel (mis à jour le 17/11/2026)
- **En cours** : aucune étape. J3 · étape 3.3 terminée.
- **Dernière étape terminée** : J3 · étape 3.3 — écran Astreintes (vues Semaine et Mois).
- **Prochaine action** : J3 · étape 3.4 (écran Rémunération et case « Est une intervention »).
- **En attente** :
  - Décision sur le critère « score PWA Lighthouse » (cahier des charges section 9) : la catégorie PWA a été retirée de Lighthouse.
  - Test de la PWA sur smartphone (HTTPS requis), cahier des charges section 11.
  - J4 : garantir que le seed et ses comptes de test (`demo@example.com` et l'administrateur `admin@example.com`) ne sont jamais appliqués en production.
  - J4 : l'hébergeur statique doit renvoyer index.html pour toute adresse (routage côté navigateur).
  - Désactiver l'inscription publique en production (J4) : `enable_signup` est gardé actif en local, car les tests créent leurs comptes par signUp.
  - Intégration continue GitHub Actions à envisager (lint, build, tests).
  - À revoir avant le J5 (D-033) : rattachement des montants d'une activité à cheval sur deux périodes et taux d'une activité qui traverse un changement de taux ou de grade ; chercher une règle du SDIS.
- **Branches ouvertes** : aucune.

## Journal

### 17/11/2026 — J3 · étape 3.3 terminée : écran Astreintes
- **Fait** : écran Astreintes `/astreintes` (`src/features/astreintes/AstreintesScreen.tsx`) : vues « Semaine » (par défaut) et « Mois », précédent / suivant, vue et période dans l'adresse (`?vue=semaine&periode=2026-W47`, `?vue=mois&periode=2026-11`), valeurs invalides ignorées ; totaux « déclarée · déduite · nette » avec détail par nature d'astreinte s'il y en a plusieurs ; une ligne par jour (dépliable en astreintes : horaires, part du jour, « à cheval », lien de modification) ou par semaine ISO limitée au mois ; bandeau des astreintes en chevauchement ; période vide. Entrée « Astreintes » du menu après « Activités » ; le menu passe à la ligne sur un écran étroit (il débordait du Pixel 7 avec cinq entrées), vérifié par les tests de parcours ; sur l'accueil, l'astreinte nette ouvre la vue Mois du mois en cours. Moteur : `astreintesDeLaPeriode` (part de chaque astreinte dans une période), exposée par `restituerSemaine`. Aides : `texteDureesAstreinte`, `formaterPlageJours` ; aides SQL des tests de parcours réunies dans `tests/e2e/aides.ts`. Tests : `npm run test` (355), `npm run test:rls` (85), `npm run test:e2e` (90, dont 10 nouveaux dans `tests/e2e/astreintes.spec.ts`, parcours a à e sur ordinateur et Pixel 7), `npm run lint` et `npm run build` sans erreur.
- **Branche** : feat/j3-3-astreintes
- **Décisions liées** : D-033, D-035, D-036, D-038 (choix techniques de l'étape, consignée par la branche docs/d038-astreintes)

### 17/11/2026 — J3 · étape 3.2 terminée : Accueil et liste des activités
- **Fait** : écran Accueil `/accueil` (`src/features/accueil/AccueilScreen.tsx`) : mois en cours via `useRestitutionMois`, astreinte nette ventilée (D-033, D-035), interventions avec la règle « Anomalies » et détail dépliable par nature (D-034), rémunération dépliable par catégorie puis par nature, bandeau d'anomalie, mention des astreintes à cheval sur deux mois, message sans grade avec lien vers Paramètres, mois vide, bouton « Nouvelle activité » et lien « Voir les activités du mois ». Navigation : « Accueil » en tête du menu, `/accueil` écran d'arrivée après connexion et après le choix d'un nouveau mot de passe, racine et adresses inconnues renvoyées vers `/accueil`, adresse demandée toujours prioritaire. Liste des activités : totaux du mois lus par le même hook que l'accueil (mêmes chiffres), nombre d'interventions, étiquette « Intervention », filtre « Interventions » (`?nature=interventions`). Éléments communs : `src/components/restitutions.tsx` (détail dépliable, nombre avec anomalies, bandeau), textes et accords dans `src/lib/textes.ts`. Tests : `npm run test` (351), `npm run test:rls` (85), `npm run test:e2e` (80, dont 12 nouveaux dans `tests/e2e/accueil.spec.ts`, parcours a à f sur ordinateur et Pixel 7 ; tests d'authentification adaptés à l'arrivée sur l'accueil), `npm run lint` et `npm run build` sans erreur.
- **Branche** : feat/j3-2-accueil
- **Décisions liées** : D-016, D-032, D-033, D-034, D-035, D-036, D-037 (choix techniques de l'étape, consignée par la branche docs/d037-accueil)

### 17/11/2026 — J3 · étape 3.1 terminée : données et regroupements des restitutions
- **Fait** : migration `supabase/migrations/20261117140000_interventions.sql` (colonne `activity_types.est_intervention`, contrainte `activity_types_astreinte_ou_intervention`), erreur `ErreurAstreinteEtIntervention` (`src/data/erreurs.ts`), saisie d'une nature avec `estIntervention` facultatif (`src/data/requetes-referentiel.ts`), types régénérés. Moteur : `calculerActivitesDetaillees` expose les plages déclarée, déduites et nettes (résultats identiques à `calculerActivites`) ; `totaliser` aligné sur D-035 (durées d'astreinte « ok » et « taux manquant ») et complété du nombre d'interventions (D-034) ; la liste des activités en hérite. Modules purs `src/engine/periodes.ts` (jour, semaine ISO, mois de Paris, changement d'heure compris ; jours d'une semaine, semaines d'un mois, mois glissants, année civile) et `src/engine/regroupement.ts` (ventilation des durées d'astreinte, rattachement des montants et des autres activités à la période de début, catégories, totaux par catégorie et par nature, interventions et anomalies, astreintes « à cheval », écart et pourcentage, historique mensuel). Couche de données `src/data/restitutions.ts` (une lecture élargie par plage, calcul unique, regroupement) et hooks `src/hooks/useRestitutions.ts` (semaine, mois avec le mois précédent, historique glissant ou année civile), invalidés par `invaliderReferentielEtCalculs` (vérifié par un test). Seed : natures Intervention VSAV, FPT, VRID (taux fictifs identiques), nature « Réunion (démo, sans taux) », jeu de démonstration à dates relatives pour `demo@example.com` (README) ; tests e2e adaptés au renommage de la nature d'intervention. Tests : `npm run test` (344), `npm run test:rls` (85), `npm run test:e2e` (68), `npm run lint` et `npm run build` sans erreur. Aucun nouvel écran.
- **Branche** : feat/j3-1-regroupements
- **Décisions liées** : D-011, D-012, D-015, D-029, D-032, D-033, D-034, D-035, D-036 (choix techniques de l'étape, consignée par la branche docs/d036-regroupements)

### 17/11/2026 — J3 · étape 3.0 terminée : spécifications des écrans v1.3
- **Fait** : docs/specifications_ecrans.md v1.3 (Accueil, Astreintes, Rémunération, menu, règles communes, interventions dans la liste, case « Est une intervention »).
- **Branche** : docs/specifications-ecrans-v1-3
- **Décisions liées** : D-032, D-033, D-034, D-035

### 17/11/2026 — Décision : durées d'astreinte en « taux manquant »
- **Fait** : D-035 consignée ; cahier des charges v1.22 (sections 3.5, 3.8, 13).
- **Branche** : docs/d035-durees-astreinte
- **Décisions liées** : D-035

### 17/11/2026 — Décision : comptage des interventions en anomalie
- **Fait** : D-034 consignée ; cahier des charges v1.21 (sections 3.5, 3.8, 13).
- **Branche** : docs/d034-comptage-interventions
- **Décisions liées** : D-034

### 17/11/2026 — Décision : ventilation des activités à cheval sur plusieurs périodes
- **Fait** : D-033 consignée ; cahier des charges v1.20 (sections 3.8, 11, 13).
- **Branche** : docs/d033-ventilation
- **Décisions liées** : D-033

### 17/11/2026 — Décision : identification des interventions
- **Fait** : D-032 consignée ; cahier des charges v1.19 (sections 3.3, 7, 8, 11, 13).
- **Branche** : docs/d032-interventions
- **Décisions liées** : D-032

### 17/11/2026 — Validation de D-031
- **Fait** : choix de la date citée dans la confirmation d'une correction de l'historique de grades validé par le porteur.
- **Branche** : docs/d031-validation
- **Décisions liées** : D-031

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
