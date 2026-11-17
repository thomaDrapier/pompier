# Journal des décisions

## Règles du journal

- Chaque décision a un identifiant unique et croissant (D-001, D-002…).
- Une décision n'est jamais réécrite ni supprimée : si elle change, on ajoute une nouvelle décision qui indique « Remplace D-xxx », et on passe l'ancienne au statut « remplacée par D-yyy ».
- Origine « projet Claude » : décision métier ou fonctionnelle, prise avec le porteur du projet. Claude Code la recopie fidèlement et ne la modifie jamais.
- Origine « Claude Code » : décision technique. Si elle a un impact métier, elle a le statut « à valider » jusqu'à validation dans le projet Claude.
- Le cahier des charges (`docs/cahier_des_charges.md`) fait foi. Une décision validée qui le modifie y est reportée dans la même branche `docs/…` (statut « intégrée au cahier des charges vX.Y »). Toute contradiction entre une décision et le cahier des charges est signalée au porteur du projet, jamais tranchée silencieusement.
- Visibilité : le projet Claude ne lit que la branche `main`. Une décision n'est connue du projet Claude qu'après fusion dans `main` et synchronisation manuelle (« Sync now »).

## Modèle

```markdown
## D-XXX — Titre court
- **Date** : JJ/MM/AAAA
- **Origine** : projet Claude | Claude Code
- **Contexte** : question posée (renvoi au cahier des charges si possible)
- **Décision** : ce qui est retenu, sans ambiguïté
- **Conséquences** : impacts sur le code, les tests, la documentation
- **Statut** : validée | à valider | intégrée au cahier des charges vX.Y | remplacée par D-xxx
```

---

## D-001 — Ordre de développement
- **Date** : 03/11/2026
- **Origine** : projet Claude
- **Contexte** : contradiction entre les sections 10 et 12 du cahier des charges v1.1.
- **Décision** : le jalon 0 ne comporte aucune interface métier. Le jalon 1 commence par le moteur de calcul (`src/engine/`) et ses tests unitaires, avant tout écran de saisie.
- **Conséquences** : section 10 du cahier des charges.
- **Statut** : intégrée au cahier des charges v1.2

## D-002 — Environnement de test
- **Date** : 03/11/2026
- **Origine** : projet Claude
- **Contexte** : hébergement de Supabase pendant la phase de test.
- **Décision** : Supabase local via la CLI Supabase installée comme dépendance de développement npm, exécutée dans Docker sur le poste de développement.
- **Conséquences** : sections 6.3 et 10 du cahier des charges. Le test d'installation de la PWA sur smartphone (HTTPS requis) reste un point ouvert (section 11).
- **Statut** : intégrée au cahier des charges v1.2

## D-003 — Structure du dépôt
- **Date** : 05/11/2026
- **Origine** : projet Claude
- **Contexte** : l'application avait été initialisée dans un sous-dossier `spv-app/` d'un dépôt Git existant (`pompier`).
- **Décision** : l'application est à la racine du dépôt `pompier` (pas de sous-dossier). Pas de dépôt Git imbriqué.
- **Conséquences** : chemins de la section 6.3 appliqués depuis la racine.
- **Statut** : intégrée au cahier des charges v1.3

## D-004 — Clé Supabase côté client
- **Date** : 05/11/2026
- **Origine** : projet Claude
- **Contexte** : Supabase fournit désormais des clés « publishable » (`sb_publishable_…`) et « secret » (`sb_secret_…`) à la place de anon et service_role.
- **Décision** : la variable `VITE_SUPABASE_ANON_KEY` (nom conservé du cahier des charges) contient la clé publishable. La clé secret n'apparaît jamais dans le code, `.env.local`, Git ni les échanges.
- **Conséquences** : section 5 du cahier des charges.
- **Statut** : intégrée au cahier des charges v1.3

## D-005 — Organisation du travail et branches
- **Date** : 05/11/2026
- **Origine** : projet Claude
- **Contexte** : répartition des rôles entre le projet Claude et Claude Code, et visibilité du projet Claude limitée à la branche `main`.
- **Décision** :
  - Le projet Claude traite les règles métier et les spécificités fonctionnelles ; Claude Code traite uniquement le code et la mise à jour des fichiers du dépôt.
  - La communication passe par `CLAUDE.md`, `docs/cahier_des_charges.md` et `docs/decisions.md`.
  - Claude Code ne travaille jamais directement sur `main` : une branche par tâche (`feat/…`, `fix/…`, `docs/…`), fusionnée après validation du porteur.
  - Les modifications de documentation passent par des branches `docs/…` courtes, fusionnées dès validation, séparément du code.
  - Après chaque fusion dans `main` touchant `CLAUDE.md` ou `docs/`, le porteur clique sur « Sync now » dans le projet Claude.
- **Conséquences** : tant qu'une branche n'est pas fusionnée, le projet Claude ignore son contenu ; pour un avis sur un travail en cours, le porteur colle le contenu concerné dans le projet Claude.
- **Statut** : intégrée au cahier des charges v1.3

## D-006 — Cahier des charges au format Markdown
- **Date** : 05/11/2026
- **Origine** : projet Claude
- **Contexte** : un PDF ne peut pas être mis à jour proprement par Claude Code, ce qui éclaterait la référence entre le PDF et le journal des décisions.
- **Décision** : `docs/cahier_des_charges.md` devient la source de référence unique. Claude Code le met à jour directement à chaque décision qui le modifie, dans la même branche `docs/…`. Les figures sont des diagrammes Mermaid. Le PDF v1.2 est archivé dans `docs/archives/` ; un PDF n'est plus qu'un export ponctuel.
- **Conséquences** : chaque modification du cahier des charges incrémente sa version et ajoute une ligne à sa section 13.
- **Statut** : intégrée au cahier des charges v1.3

## D-007 — Suivi de l'avancement du projet
- **Date** : 06/11/2026
- **Origine** : projet Claude
- **Contexte** : docs/decisions.md indique ce qui a été décidé, mais rien n'indique où en est le projet ; une nouvelle conversation (projet Claude ou Claude Code) repart sans contexte.
- **Décision** :
  - Création de docs/avancement.md, composé d'une section « État actuel » (réécrite à chaque mise à jour : jalon et étape en cours, dernière étape terminée, prochaine action, points en attente, branches ouvertes) et d'un « Journal » (entrées datées ajoutées, jamais modifiées : date, étape, ce qui a été fait, branche, décisions liées).
  - Claude Code met à jour docs/avancement.md à la fin de chaque tâche et de chaque cycle de décision.
  - Exception à D-005 : docs/avancement.md est mis à jour dans la branche de la tâche qu'il décrit (feat/…, fix/… ou docs/…), afin que main reflète toujours exactement ce qui a été fusionné.
  - En fin de séance sans décision, le projet Claude fournit le bloc « État actuel » à jour, transmis à Claude Code.
  - Toute nouvelle conversation commence par la lecture de « État actuel » puis de la fin du journal, résume au porteur où en est le projet et attend son accord avant de continuer.
- **Conséquences** : complète D-005 sans la remplacer. Cahier des charges v1.4 (sections 6.3 et 12), CLAUDE.md, instructions du projet Claude.
- **Statut** : intégrée au cahier des charges v1.4

## D-008 — Promotion du premier administrateur et protection du rôle
- **Date** : 07/11/2026
- **Origine** : Claude Code
- **Contexte** : étape 0.3 (migration 0001). Un trigger refuse toute modification de `role` ou `actif` dans `profiles` si l'utilisateur n'est pas administrateur (`is_admin()`). Or le premier administrateur est promu par SQL dans le Studio, où aucun utilisateur n'est connecté (`auth.uid()` nul) : sans exception, cette promotion serait impossible.
- **Décision** : le trigger `profiles_protect_role` ne contrôle que les requêtes émises par les utilisateurs de l'application (rôles `authenticated` et `anon`). Les accès d'administration de la base (rôle `postgres` via le Studio ou psql, `service_role` côté serveur) peuvent modifier `role` et `actif`. Depuis l'application, seul un administrateur actif le peut.
- **Conséquences** : migration `…_init_schema.sql` ; procédure de promotion décrite dans le README (section « Base de données ») ; cas vérifiés dans `supabase/tests/verification_0_3.sql`. La clé `service_role` restant hors du client, aucun utilisateur ne peut s'auto-promouvoir. Aucun impact métier.
- **Statut** : validée

## D-009 — Aucun droit pour le rôle anon sur les tables
- **Date** : 07/11/2026
- **Origine** : Claude Code
- **Contexte** : étape 0.3 (migration 0001). Par défaut, Supabase accorde des droits au rôle `anon` (visiteur non connecté) sur les tables du schéma `public` ; la RLS sans policy pour `anon` suffit déjà à masquer toutes les lignes.
- **Décision** : en défense en profondeur, les droits du rôle `anon` sont retirés (`revoke all … from anon`) sur les 6 tables, en plus de la RLS. Les policies sont réservées au rôle `authenticated`.
- **Conséquences** : migration `…_init_schema.sql` ; toute nouvelle table devra appliquer la même règle. Un visiteur non connecté reçoit un refus d'accès au lieu d'un résultat vide. Aucun impact métier.
- **Statut** : validée

## D-010 — Interdiction du chevauchement de deux astreintes
- **Date** : 13/11/2026
- **Origine** : projet Claude
- **Contexte** : cahier des charges section 11, « Chevauchement de deux astreintes » : comment répartir la durée nette entre deux astreintes qui se chevauchent (natures ou taux différents) pour le montant par activité (3.5). Point à trancher avant le J1.
- **Décision** :
  - Deux astreintes d'un même utilisateur ne peuvent pas se chevaucher. La saisie ou la modification d'une astreinte qui chevauche une autre astreinte est refusée (blocage, pas un simple avertissement).
  - Les plages sont semi-ouvertes [début, fin) : deux astreintes contiguës (fin de l'une = début de l'autre) ne se chevauchent pas et sont autorisées.
  - Le chevauchement d'une astreinte avec une activité d'une autre nature reste normal et attendu (règle de déduction 3.4).
  - Défense en profondeur : le refus est appliqué dans l'interface et contrôlé dans la base.
  - Si des données en chevauchement existent malgré tout (par exemple après le passage d'une nature au statut « astreinte »), le moteur de calcul signale les astreintes concernées en anomalie « chevauchement d'astreintes » et les exclut des totaux, avec une alerte visible, sur le modèle du « taux manquant ».
- **Conséquences** : moteur de calcul (étape 1.1) : statut d'anomalie et tests ; étape 1.2 : contrôle bloquant à la saisie et contrôle en base (trigger, migration dédiée) ; cahier des charges v1.5 (sections 3.2, 3.4, 9, 11, 13).
- **Statut** : intégrée au cahier des charges v1.5

## D-011 — Statuts, anomalies et totaux du moteur de calcul
- **Date** : 13/11/2026
- **Origine** : projet Claude
- **Contexte** : plan de l'étape 1.1 (moteur de calcul). Comportement non précisé par le cahier des charges : calculs d'une activité en anomalie, priorité entre deux anomalies, déduction d'une activité sans taux, contenu des totaux.
- **Décision** :
  - Une activité a un seul statut : « ok », « taux manquant » ou « chevauchement d'astreintes ». Si une astreinte est à la fois en chevauchement et sans taux, « chevauchement d'astreintes » l'emporte.
  - Pour une activité en anomalie, les durées et, s'il existe, le taux restent calculés et affichés ; le montant n'est pas calculé (null).
  - La déduction (3.4) ne dépend pas du taux : une activité en « taux manquant » est quand même déduite de l'astreinte qu'elle chevauche.
  - Pour une activité qui n'est pas une astreinte : durée déduite = 0, durée nette = durée déclarée.
  - Les totaux ne comptent que les activités au statut « ok », durées comme montants. Ils fournissent : le montant total, les durées d'astreinte (déclarée, déduite, nette) totalisées à part, un détail par nature (nombre, durée retenue, montant) et le nombre d'anomalies par statut.
- **Conséquences** : moteur `src/engine/` (ResultatActivite porte natureId et estAstreinte ; totaliser renvoie aussi un détail par nature) et ses tests ; cahier des charges v1.6 (section 3.5).
- **Statut** : intégrée au cahier des charges v1.6

## D-012 — Conventions techniques du moteur de calcul
- **Date** : 13/11/2026
- **Origine** : Claude Code
- **Contexte** : plan de l'étape 1.1.
- **Décision** :
  - Les instants entrent dans le moteur sous forme de `Date` et sont convertis en millisecondes UTC à l'intérieur.
  - Le début et la fin de chaque activité sont tronqués à la minute avant tout calcul (minutes entières, déclarée = déduite + nette).
  - Une entrée impossible (fin ≤ début, nature inconnue) lève une erreur explicite ; la base les interdit déjà.
  - Calculs en entiers : minutes et centimes ; montant = floor((minutes × centimesParHeure + 30) / 60), arrondi au centime le plus proche, demi vers le haut.
  - date-fns et @date-fns/tz sont ajoutés en dépendances d'exécution.
- **Conséquences** : moteur `src/engine/` et ses tests. Aucun impact métier.
- **Statut** : validée

## D-013 — Routeur de l'application
- **Date** : 13/11/2026
- **Origine** : projet Claude
- **Contexte** : choix d'un routeur avant les écrans du J1 (point en attente de docs/avancement.md). Options étudiées : React Router et TanStack Router.
- **Décision** : React Router est retenu. C'est le routeur le plus répandu et le mieux documenté, et le plus simple à prendre en main ; TanStack Router, mieux typé, demande plus de configuration.
- **Conséquences** : dépendance ajoutée à l'étape 1.2b ; cahier des charges v1.7 (section 6) ; CLAUDE.md (stack).
- **Statut** : intégrée au cahier des charges v1.7

## D-014 — Niveau de finition de l'interface
- **Date** : 13/11/2026
- **Origine** : projet Claude
- **Contexte** : rédaction de docs/specifications_ecrans.md avant les écrans de l'étape 1.2b. Le porteur prévoit un travail de design spécifique après la fin du projet.
- **Décision** :
  - Jusqu'au J5, les écrans visent la complétude fonctionnelle : composants shadcn/ui par défaut, mise en page simple, sans travail graphique spécifique.
  - Les exigences d'ergonomie de la section 5 restent applicables (mobile first, utilisation à une main, saisie en moins de 15 secondes).
  - docs/specifications_ecrans.md décrit le fonctionnement de chaque écran (contenu affiché, champs, actions, messages, navigation), pas son apparence. Il est rédigé dans le projet Claude, écran par écran, avant le développement de chaque écran.
  - Le design (identité visuelle, maquettes) fera l'objet d'un projet distinct après le J5.
- **Conséquences** : cahier des charges v1.7 (section 8) ; CLAUDE.md (méthode).
- **Statut** : intégrée au cahier des charges v1.7

## D-015 — Choix techniques de la couche de données (étape 1.2a)
- **Date** : 14/11/2026
- **Origine** : Claude Code
- **Contexte** : étape 1.2a (couche de données entre la base et le moteur de calcul). Plan validé dans le projet Claude, avec deux corrections (security invoker, élargissement de la lecture).
- **Décision** :
  - Contrôle en base du chevauchement d'astreintes (D-010) : trigger `before insert or update of user_id, activity_type_id, debut, fin` sur `activities`. Une contrainte d'exclusion a été écartée, car l'indicateur `est_astreinte` est porté par une autre table (`activity_types`).
  - La fonction du trigger est en `security invoker` (search_path vide, noms qualifiés) : la vérification s'exécute sous la RLS de l'appelant et ne voit que ses propres lignes. En `security definer`, un utilisateur insérant une ligne au nom d'un autre aurait pu déduire le planning de cet autre de la nature de l'erreur reçue.
  - Insertions simultanées : verrou transactionnel par utilisateur (`pg_advisory_xact_lock` sur une clé dérivée du `user_id`), pris avant la vérification et libéré en fin de transaction. Les écritures d'astreintes d'un même utilisateur passent l'une après l'autre ; les autres utilisateurs ne sont pas ralentis.
  - Erreur du trigger : code SQLSTATE `23P01` et message `chevauchement_astreintes`, sans autre donnée. Côté client, elle est reconnue au code ET au message réunis, et traduite en `ErreurChevauchementAstreintes`.
  - Seed local (`supabase/seed.sql`, joué par `supabase db reset` uniquement) : le compte de test fictif `demo@example.com` est créé directement dans `auth.users` et `auth.identities`, avec un mot de passe fictif écrit en clair dans le seed et le README. Ces tables appartiennent à Supabase : le seed est à revérifier après une mise à jour de la CLI.
  - Lecture d'une période [début, fin) : on lit d'abord les astreintes qui commencent dans la période, puis toutes les activités qui chevauchent l'enveloppe [min(début de la période, débuts des astreintes), max(fin de la période, fins des astreintes)). Le moteur calcule sur cet ensemble élargi ; seuls les résultats des activités qui commencent dans la période sont conservés et totalisés.
  - Le rattachement d'une activité à la période où elle commence est provisoire pour le J1 (hypothèse de 3.8, point ouvert en section 11) ; la ventilation au prorata reste au J3.
  - `taux_horaire` (euros, 2 décimales) est converti en centimes entiers par arrondi, avec une tolérance pour les imprécisions des nombres à virgule ; un taux à plus de 2 décimales lève une erreur.
  - `@tanstack/react-query` est ajouté en dépendance d'exécution. Les requêtes de l'application sont testées contre Supabase local dans `npm run test:rls` (`tests/rls/requetes.test.ts`, `tsconfig.integration.json`).
- **Conséquences** : migration `…_chevauchement_astreintes.sql`, `supabase/seed.sql`, `src/data/`, `src/hooks/`, `tests/rls/`, README. À traiter au J4 : garantir que le seed et le compte de test ne sont jamais appliqués en production (docs/avancement.md, « En attente »). Aucun impact métier au-delà du rattachement provisoire à la période de début.
- **Statut** : validée

## D-016 — Choix techniques des écrans du J1 (étape 1.2b)
- **Date** : 14/11/2026
- **Origine** : Claude Code
- **Contexte** : étape 1.2b (écrans « Liste des activités » et « Saisie / modification », routage React Router). Plan validé dans le projet Claude ; précisions fonctionnelles intégrées à docs/specifications_ecrans.md v1.1.
- **Décision** :
  - Adresses : `/connexion`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe`, `/activites`, `/activites/nouvelle`, `/activites/:id` ; la racine et toute adresse inconnue renvoient vers `/activites`. Routage côté navigateur (`BrowserRouter`).
  - Routes protégées : sans session, redirection vers `/connexion` en mémorisant l'adresse demandée (état de navigation), à laquelle l'utilisateur revient après connexion. Seules les adresses internes sont acceptées comme destination.
  - Le mois et le filtre de la liste sont dans l'adresse (`?mois=AAAA-MM&nature=<id>`) : ils sont conservés par le bouton « retour » et au retour d'un autre écran. Un mois mal formé ou une nature inconnue sont ignorés (mois en cours, filtre « Toutes »). Le mois est le mois calendaire de Paris.
  - Lien de réinitialisation : il arrive toujours sur la racine du site (`redirectTo` inchangé, aucune modification de `supabase/config.toml`). Sa détection passe avant toute redirection. La récupération en cours est notée dans le stockage du navigateur avec l'identifiant du compte, pour rester active après un rechargement de la page ou dans un autre onglet ; la note est effacée à l'enregistrement du mot de passe, à la déconnexion, ou si le compte connecté n'est plus le même.
  - À la déconnexion, les données gardées en mémoire par TanStack Query sont vidées.
  - Contrôles de la saisie : les règles sont des fonctions pures (`regles-saisie.ts`, `etat-formulaire.ts`). Avant l'enregistrement, l'écran lit les activités qui chevauchent la plage saisie ; l'erreur de chevauchement renvoyée par la base reste traitée (message générique).
  - En modification, la date de fin enregistrée n'est jamais recalculée : la règle « fin au lendemain » ne s'applique qu'à la création.
  - Textes accordés : « et 1 autre » / « et N autres » ; « 1 activité non comptée » / « N activités non comptées », en ne citant que les anomalies présentes.
  - Messages « Activité enregistrée » et « Activité supprimée » : transmis à la liste par l'état de navigation, sans dépendance supplémentaire.
  - Nature et filtre : listes déroulantes natives ; composants shadcn/ui ajoutés : `alert-dialog`, `badge`, `textarea`.
  - Tests de parcours : chaque test d'activités crée son propre compte fictif et lui attribue le grade « Sapeur » du seed, pour pouvoir tourner en parallèle ; `npm run test:e2e` exige donc le seed (`supabase db reset`). La réinitialisation du mot de passe est testée de bout en bout par l'API de Mailpit.
- **Conséquences** : `src/App.tsx`, `src/routes/`, `src/features/activites/`, `src/lib/formats.ts`, `src/lib/temps.ts`, `src/features/auth/AuthProvider.tsx`, `tests/e2e/`, README. À traiter au J4 : l'hébergeur statique doit renvoyer `index.html` pour toute adresse (docs/avancement.md, « En attente »). Aucun impact métier.
- **Statut** : validée

## D-017 — Périmètre du jalon 2
- **Date** : 15/11/2026
- **Origine** : projet Claude
- **Contexte** : le cahier des charges est ambigu sur le contenu du J2. La section 10 cite « grades, natures, taux avec dates d'effet, écran d'administration ». La section 8 range aussi la gestion des utilisateurs dans l'écran d'administration. L'écran Paramètres (section 8, n° 7) n'est rattaché à aucun jalon. Depuis le J1, le grade du porteur est saisi à la main dans le Studio. Section 11 : « Qui renseigne le grade d'un utilisateur ».
- **Décision** :
  - Le J2 comprend : l'administration du référentiel (grades, natures d'activité, grille de taux à dates d'effet avec historique), réservée à l'administrateur ; l'écran Paramètres (grade actuel et historique des grades avec dates d'effet, consultation en lecture seule des taux applicables à son grade).
  - C'est l'utilisateur qui renseigne lui-même son grade et ses promotions (hypothèse de la section 11, confirmée).
  - La gestion des utilisateurs (création, désactivation, rôle) est reportée au J5, avec l'ouverture aux collègues.
  - Découpage : 2.0 décisions de gestion du référentiel et spécifications des écrans (projet Claude) ; 2.1 données (migration si nécessaire, tests RLS, requêtes et hooks) ; 2.2 écrans d'administration ; 2.3 écran Paramètres.
- **Conséquences** : cahier des charges v1.9 (sections 10, 11 et 13). Les étapes 2.1 à 2.3 attendent les décisions de gestion du référentiel et les spécifications des écrans du J2.
- **Statut** : intégrée au cahier des charges v1.9

## D-018 — Suppression et archivage des grades et des natures
- **Date** : 15/11/2026
- **Origine** : projet Claude
- **Contexte** : étape 2.0 du J2. Les clés étrangères en mode « restrict » empêchent déjà de supprimer un élément du référentiel utilisé ailleurs. `activity_types` a une colonne `actif` (section 3.3), `grades` n'en a pas (section 7).
- **Décision** :
  - Un grade ou une nature ne peut être supprimé que s'il n'a jamais servi : aucune activité, aucun taux et aucune ligne d'historique de grade ne le référence. Sinon, l'administrateur l'archive.
  - Une colonne `actif` (booléen, vrai par défaut, non nulle) est ajoutée à `grades`, sur le modèle de `activity_types`.
  - Une nature archivée n'est plus proposée à la saisie d'une nouvelle activité. Un grade archivé n'est plus proposé lors de l'ajout d'une ligne d'historique de grade (écran Paramètres).
  - L'archivage n'a aucun effet sur le calcul : les activités, les historiques de grade et les taux existants qui référencent un élément archivé restent valables et sont calculés normalement.
  - Les éléments archivés restent visibles dans l'administration, signalés comme archivés, et peuvent être réactivés.
  - En modification d'une activité existante dont la nature est archivée, cette nature reste affichée et peut être conservée.
- **Conséquences** : migration à l'étape 2.1 (colonne `grades.actif`, types régénérés) ; filtres des listes de choix (saisie d'activité, Paramètres) ; tests RLS et tests de suppression refusée ; cahier des charges v1.10 (sections 3.3, 3.6, 7 et 13).
- **Statut** : intégrée au cahier des charges v1.10

## D-019 — Nouveau taux, correction et suppression d'une ligne de taux
- **Date** : 15/11/2026
- **Origine** : projet Claude
- **Contexte** : étape 2.0 du J2. Selon la section 3.6, un changement de taux se fait en ajoutant une ligne, mais l'administrateur peut corriger une erreur de saisie. Les montants n'étant jamais stockés, toute correction modifie les montants déjà affichés.
- **Décision** :
  - Action principale « Nouveau taux » : ajout d'une ligne (grade, nature, taux horaire, date d'effet). C'est le cas normal d'un changement de barème ; l'historique est préservé.
  - Action secondaire « Corriger » : modification du taux horaire ou de la date d'effet d'une ligne existante, réservée à la correction d'une erreur de saisie. Une confirmation prévient que les montants des activités concernées seront recalculés.
  - « Supprimer » une ligne de taux : autorisé, avec la même confirmation. Les activités concernées reprennent le taux précédent en vigueur ou, à défaut, passent en « taux manquant ».
  - Le message de confirmation est générique : la RLS empêche l'administrateur de lire les activités des autres utilisateurs, l'application ne peut donc pas les dénombrer.
  - Les corrections et suppressions ne sont pas tracées (administrateur unique).
  - L'unicité (grade, nature, date d'effet) s'applique aussi aux corrections.
- **Conséquences** : écran d'administration de la grille de taux (étape 2.2) et ses messages ; requêtes de modification et de suppression des taux (étape 2.1) ; cahier des charges v1.11 (sections 3.6 et 13).
- **Statut** : intégrée au cahier des charges v1.11

## D-020 — Nouveau taux avec une date d'effet passée ou future
- **Date** : 15/11/2026
- **Origine** : projet Claude
- **Contexte** : étape 2.0 du J2. Un barème peut être publié avec effet rétroactif. Un « Nouveau taux » (D-019) dont la date d'effet est passée modifie alors les montants déjà affichés.
- **Décision** :
  - Une date d'effet passée est autorisée. Est passée une date antérieure ou égale à la date du jour à Paris.
  - Elle demande une confirmation générique : « Cette date d'effet est passée : les montants des activités à partir du JJ/MM/AAAA seront recalculés. » L'application ne dénombre pas les activités concernées (RLS).
  - Une date d'effet future est autorisée sans confirmation : elle ne modifie aucun montant passé (section 9).
  - La même confirmation s'applique quand une correction (D-019) porte la date d'effet à une date passée.
- **Conséquences** : écran d'administration de la grille de taux (étape 2.2) ; cahier des charges v1.11 (sections 3.6 et 13).
- **Statut** : intégrée au cahier des charges v1.11

## D-021 — Portée rétroactive des dates d'effet
- **Date** : 15/11/2026
- **Origine** : projet Claude
- **Contexte** : contradictions relevées par Claude Code en appliquant D-019 et D-020. Selon la section 3.5 du cahier des charges, « une modification de barème ou un changement de grade n'altère jamais rétroactivement les mois passés », ce qui contredit D-020 (date d'effet passée) et D-019 (correction, suppression). Depuis D-017, l'utilisateur saisit lui-même son historique de grades, éventuellement avec une date d'effet passée. CLAUDE.md dit « on ajoute une ligne, on n'écrase jamais l'historique », ce qui contredit la correction et la suppression de D-019.
- **Décision** :
  - Le taux appliqué reste celui en vigueur à la date de début de l'activité, pour le grade de l'utilisateur à cette date.
  - Un taux ou un grade dont la date d'effet est future ne modifie aucun montant passé.
  - Les montants n'étant jamais stockés, les montants passés ne changent que par un acte explicite : ajout d'un taux avec une date d'effet passée (D-020) ; correction ou suppression d'une ligne de taux (D-019) ; ajout, correction ou suppression d'une ligne de l'historique de grades avec une date d'effet passée (D-017).
  - Un changement de barème ajoute toujours une ligne et n'écrase jamais l'historique. Seule la correction d'une erreur de saisie par l'administrateur modifie ou supprime une ligne de taux existante.
  - Une éventuelle confirmation lors de la saisie d'un grade à date d'effet passée sera traitée dans la spécification de l'écran Paramètres.
- **Conséquences** : cahier des charges v1.11 (sections 3.5 et 13) ; CLAUDE.md (règles métier non négociables). Aucun impact sur le moteur de calcul, qui applique déjà cette règle.
- **Statut** : intégrée au cahier des charges v1.11

## D-022 — Verrouillage de l'indicateur « est une astreinte »
- **Date** : 15/11/2026
- **Origine** : projet Claude
- **Contexte** : étape 2.0 du J2. Modifier l'indicateur `est_astreinte` d'une nature déjà utilisée changerait rétroactivement les déductions, les durées nettes et les montants de toutes les activités concernées. Cela pourrait aussi faire apparaître des chevauchements d'astreintes (D-010).
- **Décision** :
  - L'indicateur « est une astreinte » d'une nature est modifiable tant qu'aucune activité, de quelque utilisateur que ce soit, n'utilise cette nature. Il est ensuite verrouillé.
  - Pour changer de comportement, l'administrateur crée une nouvelle nature et archive l'ancienne (D-018). Les activités existantes et leurs calculs restent intacts.
  - Défense en profondeur : le verrou est appliqué dans l'interface (indicateur non modifiable, avec une explication) et contrôlé dans la base.
  - Le contrôle en base doit porter sur les activités de tous les utilisateurs. Il ne doit donc pas dépendre de la RLS, qui empêche l'administrateur de lire les activités des autres. Le moyen de savoir dans l'interface si une nature a servi est un choix technique de l'étape 2.1. Il ne doit révéler aucune donnée d'activité (au plus un booléen).
- **Conséquences** : migration à l'étape 2.1 (contrôle en base, tests de refus, dont le cas d'une nature utilisée seulement par un autre utilisateur) ; écran d'administration des natures (étape 2.2) ; cahier des charges v1.12 (sections 3.3 et 13). Le scénario de D-010 (passage d'une nature déjà utilisée au statut « astreinte ») devient impossible ; le signalement d'anomalie du moteur reste en place par sécurité.
- **Statut** : intégrée au cahier des charges v1.12

## D-023 — Code d'une nature d'activité
- **Date** : 15/11/2026
- **Origine** : projet Claude
- **Contexte** : étape 2.0 du J2. Chaque nature possède un code court (section 3.3), dont ni l'unicité, ni la modifiabilité, ni le rôle n'étaient définis.
- **Décision** :
  - Le code est obligatoire et unique, sans distinction entre majuscules et minuscules. L'unicité est contrôlée dans la base.
  - Il est modifiable à tout moment par l'administrateur, y compris pour une nature déjà utilisée.
  - Il est purement informatif (libellé court pour l'affichage). Aucune règle de calcul ni de restitution, présente ou future, ne doit s'appuyer sur la valeur d'un code ; le moteur et l'application utilisent l'identifiant interne. Un besoin de classement (par exemple l'identification des interventions, à trancher avant le J3) passera par un indicateur dédié, pas par un code.
- **Conséquences** : migration à l'étape 2.1 (contrainte d'unicité insensible à la casse, si elle n'existe pas déjà ; test de refus d'un doublon) ; écran d'administration des natures (étape 2.2) ; vérifier qu'aucun code existant ne dépend de la valeur d'un code (seed compris) ; cahier des charges v1.13 (sections 3.3, 7 et 13).
- **Statut** : intégrée au cahier des charges v1.13

## D-024 — Unicité du libellé des grades
- **Date** : 17/11/2026
- **Origine** : projet Claude
- **Contexte** : étape 2.0 du J2, spécification de l'écran d'administration des grades. Ni l'unicité ni la casse du libellé d'un grade n'étaient définies (section 7). Deux grades de même libellé seraient indiscernables dans les listes de choix (écran Paramètres, grille de taux).
- **Décision** :
  - Le libellé d'un grade est obligatoire et unique, sans distinction entre majuscules et minuscules, sur le modèle du code des natures (D-023).
  - L'unicité porte sur tous les grades, actifs comme archivés, afin qu'une réactivation ne crée jamais de doublon.
  - L'unicité est contrôlée dans la base ; l'interface affiche « Un grade porte déjà ce libellé. »
- **Conséquences** : migration à l'étape 2.1 (contrainte d'unicité insensible à la casse sur `grades.libelle`, test de refus d'un doublon, vérification que le seed la respecte) ; écran d'administration des grades (étape 2.2) ; cahier des charges v1.14 (sections 3.6, 7 et 13).
- **Statut** : intégrée au cahier des charges v1.14

## D-025 — Fusion dans main par Claude Code
- **Date** : 17/11/2026
- **Origine** : projet Claude
- **Contexte** : le porteur souhaite réduire les interactions. Jusqu'ici, toute fusion dans `main` attendait son accord (cahier des charges, sections 12.2 et 12.3 ; CLAUDE.md, section Git).
- **Décision** :
  - Claude Code fusionne lui-même sa branche dans `main` à la fin de chaque tâche, sans attendre l'accord du porteur, puis pousse `main` et supprime la branche (locale et distante).
  - On ne committe toujours jamais directement sur `main` : une branche par tâche (`feat/…`, `fix/…`, `docs/…`).
  - Branches `docs/…` : fusion dès que les fichiers sont à jour.
  - Branches `feat/…` et `fix/…` : fusion seulement si `npm run lint`, `npm run build`, `npm run test`, `npm run test:rls` et `npm run test:e2e` passent sans erreur. Sinon, pas de fusion : Claude Code s'arrête et rend compte au porteur.
  - Après chaque fusion, Claude Code donne au porteur un compte rendu court (branche, contenu, résultat des contrôles) et lui rappelle de cliquer sur « Sync now » dans le projet Claude.
  - En cas d'incident sur un conflit de fusion, Claude Code s'arrête et demande au porteur.
- **Conséquences** : cahier des charges v1.15 (sections 12.2, 12.3 et 13) ; CLAUDE.md (section Git) ; instructions du projet Claude (mises à jour par le porteur). Si une décision antérieure exige l'accord du porteur avant la fusion, la signaler au porteur dans le compte rendu sans la modifier.
- **Statut** : intégrée au cahier des charges v1.15

## D-026 — Unicité du libellé des natures d'activité
- **Date** : 17/11/2026
- **Origine** : projet Claude
- **Contexte** : étape 2.0 du J2, spécification de l'écran d'administration des natures. Seul le code des natures était unique (D-023) ; deux natures de même libellé seraient indiscernables dans la liste de saisie et dans la grille de taux.
- **Décision** :
  - Le libellé d'une nature est obligatoire et unique, sans distinction entre majuscules et minuscules, sur le modèle du libellé des grades (D-024).
  - L'unicité porte sur toutes les natures, actives comme archivées.
  - L'unicité est contrôlée dans la base ; l'interface affiche « Une nature porte déjà ce libellé. »
- **Conséquences** : migration à l'étape 2.1 (contrainte d'unicité insensible à la casse sur `activity_types.libelle`, test de refus d'un doublon, vérification que le seed la respecte) ; écran d'administration des natures (étape 2.2) ; cahier des charges v1.16 (sections 3.3, 7 et 13).
- **Statut** : intégrée au cahier des charges v1.16

## D-027 — Taux horaire nul autorisé
- **Date** : 17/11/2026
- **Origine** : projet Claude
- **Contexte** : étape 2.0 du J2, spécification de la grille de taux. Le signe autorisé d'un taux horaire n'était pas défini. Sans taux, une activité est en « taux manquant » et exclue de tous les totaux, durées comprises (D-011) ; une nature non rémunérée serait donc toujours en anomalie.
- **Décision** :
  - Un taux horaire est positif ou nul (≥ 0,00 €/h), avec 2 décimales au plus. Un taux négatif est refusé.
  - Une activité dont le taux applicable est 0,00 €/h a le statut « ok » : son montant est 0,00 € et ses durées sont comptées dans les totaux.
  - Le contrôle est appliqué dans l'interface et dans la base.
- **Conséquences** : migration à l'étape 2.1 (contrainte `taux_horaire >= 0` sur `reference_rates` si elle n'existe pas déjà, test de refus d'un taux négatif, test d'acceptation d'un taux nul) ; moteur de calcul : vérifier par un test qu'un taux nul donne le statut « ok » et un montant nul (aucune autre modification attendue) ; écran de la grille de taux (étape 2.2) ; cahier des charges v1.17 (sections 3.5, 7 et 13).
- **Statut** : intégrée au cahier des charges v1.17

## D-028 — Unicité de la date d'effet dans l'historique de grades
- **Date** : 17/11/2026
- **Origine** : projet Claude
- **Contexte** : étape 2.0 du J2, spécification de l'écran Paramètres. Rien n'interdisait deux lignes de `user_grade_history` d'un même utilisateur à la même date d'effet ; le grade en vigueur à cette date serait alors ambigu et le résultat du calcul imprévisible.
- **Décision** :
  - Pour un même utilisateur, deux lignes de l'historique de grades ne peuvent pas avoir la même date d'effet. La règle s'applique à l'ajout comme à la correction.
  - L'unicité est contrôlée dans la base ; l'interface affiche « Un grade est déjà enregistré à cette date. »
- **Conséquences** : migration à l'étape 2.1 (contrainte d'unicité sur `user_grade_history (user_id, date_effet)`, test de refus, vérification que le seed la respecte et qu'aucune donnée locale existante ne la viole avant de l'appliquer) ; écran Paramètres (étape 2.3) ; cahier des charges v1.18 (sections 3.7, 7 et 13).
- **Statut** : intégrée au cahier des charges v1.18

## D-029 — Choix techniques des données du référentiel (étape 2.1)
- **Date** : 17/11/2026
- **Origine** : Claude Code
- **Contexte** : J2, étape 2.1 (migration du référentiel, verrou de « est une astreinte », couche de données, tests). Plan validé dans le projet Claude. Le verrou et `nature_utilisee` s'écartent du choix `security invoker` de D-015.
- **Décision** :
  - Migration `…_referentiel_j2.sql` : colonne `grades.actif` (D-018). Unicités insensibles à la casse par des index uniques sur `lower(...)`, sans filtre sur `actif` (archivés compris) : `grades_libelle_unique_ci` (D-024), `activity_types_libelle_unique_ci` (D-026), `activity_types_code_unique_ci` (D-023). Les contraintes `unique` de la migration 0001, sensibles à la casse (`grades_libelle_key`, `activity_types_code_key`), sont supprimées.
  - Le taux positif ou nul (D-027) et la date d'effet unique de l'historique de grades (D-028) existaient depuis la migration 0001 : ces contraintes sont seulement renommées, comme l'unicité des taux : `reference_rates_taux_positif_ou_nul`, `reference_rates_grade_nature_date_unique`, `user_grade_history_user_date_unique`. Chaque contrainte et chaque index du référentiel a ainsi un nom explicite, reconnu par l'application.
  - Verrou de « est une astreinte » (D-022) : trigger `activity_types_verrouiller_est_astreinte` (`before update of est_astreinte`), fonction `verrouiller_est_astreinte()`. Si la valeur change et qu'une activité utilise la nature, refus avec le code SQLSTATE `SPV01` (classe propre à l'application, hors des codes de PostgreSQL) et le message `est_astreinte_verrouille`, sans autre donnée. Avant la vérification, la fonction verrouille la ligne de la nature (`select … for update`) : une activité en cours d'écriture sur cette nature est attendue puis vue, et les écritures suivantes attendent la fin de la modification.
  - Le verrou et la fonction `nature_utilisee(p_activity_type_id uuid) returns boolean` sont en `security definer`, avec `search_path` vide et des noms qualifiés. Justification : ils doivent voir les activités de tous les utilisateurs, que la RLS cache à l'administrateur ; une nature utilisée par les seuls autres utilisateurs serait sinon jugée libre. Ils n'en révèlent aucune : le verrou ne renvoie qu'un refus au code et au message fixes, `nature_utilisee` qu'un booléen. D-015 reste valable pour le trigger de chevauchement, qui ne doit voir que les lignes de l'appelant.
  - Droits : la fonction du verrou n'est exécutable ni par `anon` ni par `authenticated`. `nature_utilisee` lève une erreur `42501` si l'appelant n'est pas administrateur (`is_admin()`) ; l'exécution est accordée à `authenticated` seulement et retirée explicitement à `anon` et `public` (D-009), Supabase l'accordant par défaut.
  - RLS : vérifiée sans modification (référentiel en lecture pour les connectés et en écriture pour l'administrateur ; historique de grades limité à ses lignes, avec `with check` ; lecture de son propre profil).
  - Conversion des erreurs (`src/data/erreurs.ts`) : reconnaissance au code SQLSTATE et au nom de la contrainte (lu dans le message de PostgreSQL), ou au code et au message fixe d'un trigger, jamais au seul texte. `ErreurDoublon` (cas `libelle_grade`, `libelle_nature`, `code_nature`, `taux`, `date_effet_grade`, avec les messages des spécifications), `ErreurTauxNegatif`, `ErreurAstreinteVerrouillee`. `ErreurDejaServi` n'est produite que par `traduireErreurSuppression`, utilisée par la suppression d'un grade ou d'une nature : une violation de clé étrangère à l'insertion aurait un autre sens.
  - Couche de données : requêtes du référentiel, de l'historique de grades et du profil dans `src/data/requetes-referentiel.ts` ; hooks `useAdministrationReferentiel.ts`, `useEcritureHistoriqueGrades.ts`, `useProfil.ts`. `estAdmin` = rôle `admin` ET actif (règle de `is_admin()`).
  - Invalidations TanStack Query : toutes les clés du référentiel commencent par `['referentiel']`. Après toute écriture du référentiel ou de l'historique de grades, `invaliderReferentielEtCalculs` invalide `['referentiel']`, `['historique-grades']` et `['activites']`, c'est-à-dire toutes les lectures des calculs de période : les montants affichés se recalculent.
  - Moteur (`src/engine/taux.ts`) : la règle de la ligne en vigueur est extraite dans `ligneEnVigueur`, réutilisée par `gradeEnVigueur` et `tauxEnVigueur` (comportement inchangé). Fonctions ajoutées, avec leurs tests : `prochaineLigne`, `statutLigne` (« à venir », « en vigueur », « passé »), `estDateEffetPassee` (antérieure ou égale à la date du jour à Paris), `tauxDuCouple`. L'affichage (`src/data/affichage-referentiel.ts`) ne fait que les appeler.
  - Tests : les libellés fixes des natures de test (« TEST », « TEST astreinte »…) sont suffixés, pour respecter l'unicité des libellés (D-026).
- **Conséquences** : migration `…_referentiel_j2.sql`, `src/types/database.ts`, `src/engine/`, `src/data/`, `src/hooks/`, `tests/rls/referentiel.test.ts`, README. Aucun impact métier.
- **Statut** : validée

## D-030 — Choix techniques des écrans d'administration (étape 2.2)
- **Date** : 17/11/2026
- **Origine** : Claude Code
- **Contexte** : J2, étape 2.2 (menu, garde d'accès, écrans Administration › Grades, Natures, Grille de taux, natures archivées dans la saisie). Plan validé dans le projet Claude ; docs/specifications_ecrans.md v1.2 fait foi pour l'interface.
- **Décision** :
  - Menu : rangée de liens toujours visible sous la barre de titre de l'en-tête (« Activités », puis « Administration » pour l'administrateur seulement, selon `useProfil`), sans menu déroulant à ouvrir. L'entrée de la rubrique affichée porte `aria-current="page"`.
  - Garde d'accès : un composant enveloppe (`AdministrationLayout`) commun aux routes `/admin/…`, placé sous les routes protégées. Pendant la lecture du profil, il n'affiche que « Chargement… » ; un non-administrateur voit « Accès réservé à l'administrateur » et « Retour aux activités ». La garde n'est qu'un confort : la protection reste la RLS.
  - Routes : routes imbriquées sous `/admin` ; `/admin` redirige vers `/admin/grades`. Les onglets Grades, Natures, Grille de taux sont des liens, un par adresse (le bouton « retour » fonctionne entre eux), et non des onglets ARIA. Grille de taux : grade dans l'adresse (`?grade=<id>`, identifiant inconnu ignoré, premier grade de la liste sinon) ; l'historique d'un couple s'ouvre par `&nature=<id>`, pour que « retour » ramène à la grille.
  - Formulaires : ajout en haut de la liste, modification à la place de la ligne concernée. Contrôles en fonctions pures testées (`src/features/admin/regles-admin.ts`) : textes obligatoires après suppression des espaces de début et de fin, ordre entier dans les bornes d'un `int`, date d'effet existante au calendrier. La base reste la référence (doublons, verrou, taux négatif) ; ses refus sont traduits par `messageErreur` (`src/features/admin/messages.ts`), qui reprend les messages des spécifications.
  - Analyse de la saisie d'un taux : espaces retirés ; virgule ou point acceptés ; nombre positif ou nul, chiffres seuls (pas de signe, d'espace ni d'exposant), 2 décimales au plus ; plafond de `numeric(10, 2)`. Le calcul passe par les centimes entiers (« 12,5 » donne exactement 12.5). Un signe « - » donne le message de taux négatif. En correction, le champ est prérempli au format « 12,50 ».
  - Confirmations (D-019, D-020) : boîte `alert-dialog`, titre court et texte exact des spécifications. Nouveau taux : confirmation seulement si la date d'effet est passée (`estDateEffetPassee`). Correction : toujours, complétée par le message de D-020 si la nouvelle date d'effet est passée. Le texte est calculé au moment de l'action, jamais pendant l'affichage.
  - Case « Est une astreinte » : relue par `nature_utilisee` à chaque ouverture de la modification ; grisée pendant la lecture, puis libre ou grisée avec l'explication. Si la base refuse quand même (`ErreurAstreinteVerrouillee`, nature utilisée entre-temps), la lecture est relancée et l'explication s'affiche ; une case grisée garde toujours la valeur d'origine.
  - Messages : réussites des spécifications en haut de l'écran ; archiver et réactiver n'affichent aucun message (la mention « Archivé(e) » change), les spécifications n'en prévoyant pas. Erreur réseau ou serveur : message générique, saisie conservée ; hors ligne : aucune écriture tentée, message.
  - Saisie d'une activité : en modification, une nature archivée est affichée « <libellé> (Archivée) ». Le filtre de la liste des activités proposait déjà toutes les natures ; les archivées y sont signalées de la même façon.
  - Composants : shadcn/ui existants (`button`, `badge`, `input`, `label`, `alert-dialog`) ; listes déroulantes et case à cocher natives, comme pour les écrans du J1 (D-016). Aucun nouveau composant ni nouvelle dépendance.
  - Seed : compte administrateur fictif `admin@example.com` / `admin-spv-local` (uuid fixe), créé comme `demo@example.com` dans `auth.users` et `auth.identities`, puis promu (`role = 'admin'`, `actif = true`) par le seed, joué par le rôle postgres (D-008). Il est couvert par le point J4 « seed jamais appliqué en production ».
  - Tests de parcours : chaque test d'administration crée ses propres comptes (administrateur promu par SQL) et un référentiel fictif suffixé, d'ordre élevé (900 et plus), supprimé à la fin ; aucun élément du seed n'est modifié. Le compte `admin@example.com` n'est utilisé qu'en lecture (connexion et menu).
- **Conséquences** : `src/components/EnTete.tsx`, `src/App.tsx`, `src/routes/adresses.ts`, `src/features/admin/`, `src/features/activites/`, `src/lib/formats.ts`, `supabase/seed.sql`, `tests/e2e/`, README. Aucun impact métier.
- **Statut** : validée

## D-031 — Choix techniques de l'écran Paramètres (étape 2.3)
- **Date** : 17/11/2026
- **Origine** : Claude Code
- **Contexte** : J2, étape 2.3 (écran Paramètres, docs/specifications_ecrans.md v1.2, section 5). Plan validé dans le projet Claude. La spécification demande, en correction d'une ligne de l'historique de grades, la confirmation de D-021 « si la date d'effet résultante, ancienne ou nouvelle, est passée », sans dire quelle date citer dans « à partir du JJ/MM/AAAA ».
- **Décision** :
  - Date citée dans la confirmation d'une correction : la plus ancienne des dates passées parmi l'ancienne et la nouvelle date d'effet, puisque c'est à partir d'elle que les montants changent (une date future ne modifie aucun montant déjà affiché). Ajout : la date d'effet saisie, si elle est passée. Fonction pure `dateAConfirmer` (`src/features/parametres/regles-parametres.ts`), testée. **Point à valider dans le projet Claude.** Validé par le porteur dans le projet Claude le 17/11/2026.
  - Formulaire de grade : liste déroulante native, sans grade présélectionné à l'ajout (« Choisir… »), la spécification ne fixant pas de valeur par défaut ; date d'effet préremplie avec la date du jour à Paris. En correction, le grade de la ligne est proposé même s'il est archivé, signalé « (Archivé) ».
  - Grade actuel, statuts « Actuel » / « À venir » et taux du grade : fonctions de `src/data/affichage-referentiel.ts` (moteur de calcul), lues avec la date du jour à Paris fixée à l'ouverture de l'écran. Taux : une ligne par nature active, dans l'ordre du référentiel.
  - « Changer le mot de passe » : même appel que « Mot de passe oublié » (`envoyerLienReinitialisation`, `src/features/auth/reinitialisation.ts`, `redirectTo` inchangé, D-016). L'utilisateur étant connecté, un échec d'envoi est signalé, contrairement à « Mot de passe oublié », qui reste neutre.
  - Messages : réussites de « Mon grade » en haut de l'écran ; message du lien envoyé dans la section « Compte », à côté du bouton.
  - Mutualisation, sans changement de comportement : éléments d'interface communs déplacés de `src/features/admin/` vers `src/components/communs.tsx` ; messages hors ligne, d'erreur serveur et de chargement dans `src/lib/messages.ts` ; textes « … depuis le … » et « … à partir du … » des taux dans `src/data/affichage-referentiel.ts`, utilisés par la grille de taux et par Paramètres ; lecture de Mailpit dans `tests/e2e/aides.ts`.
  - Recalcul des montants : les invalidations de D-029 suffisent (après une écriture de l'historique, le référentiel, les historiques de grades et les activités sont relus). Vérifié par un test de parcours : une activité en « taux manquant » prend son montant après l'ajout d'un grade, sans recharger la page.
- **Conséquences** : `src/features/parametres/`, `src/components/EnTete.tsx`, `src/App.tsx`, `src/routes/adresses.ts`, `src/features/auth/`, `tests/e2e/parametres.spec.ts`, README. Seul impact métier possible : la date citée dans la confirmation d'une correction (texte affiché, sans effet sur le calcul).
- **Statut** : validée

## D-032 — Identification des interventions
- **Date** : 17/11/2026
- **Origine** : projet Claude
- **Contexte** : ouverture du J3. L'accueil affiche le nombre d'interventions du mois et la liste des activités met les interventions en avant (sections 3.8 et 8), mais rien dans le modèle ne distingue une intervention ; D-023 interdit de s'appuyer sur le code d'une nature. Le porteur distingue trois types d'interventions selon l'engin (VSAV, le plus courant ; FPT ; VRID), qui ont aujourd'hui le même taux horaire.
- **Décision** :
  - Un indicateur « Est une intervention » (`activity_types.est_intervention`, booléen, non nul, faux par défaut) est ajouté aux natures. Il est géré par l'administrateur.
  - Les types d'interventions sont des natures distinctes du référentiel (par exemple « Intervention VSAV », « Intervention FPT », « Intervention VRID »), chacune cochée « Est une intervention ». La saisie d'une activité reste inchangée (une seule nature).
  - Chaque nature a ses propres lignes de taux : un changement de barème commun aux trois types s'enregistre par une ligne par nature. Des taux différents par engin restent possibles sans modification.
  - Une nature ne peut pas être à la fois une astreinte et une intervention ; la base le contrôle.
  - L'indicateur est modifiable à tout moment, y compris pour une nature déjà utilisée : il ne sert qu'aux restitutions (comptage, mise en avant, regroupement) et n'a aucun effet sur les durées ni sur les montants.
  - Les restitutions comptent les interventions ensemble, avec un détail par nature.
  - Aucune nature n'est fixée par cette décision : elles sont créées par l'administrateur depuis l'écran d'administration (en production, au J4). Le seed peut en créer avec des taux fictifs.
- **Conséquences** : migration au J3 (colonne, contrainte d'exclusion astreinte / intervention, tests) ; écran d'administration des natures (case « Est une intervention ») et restitutions, à décrire dans docs/specifications_ecrans.md v1.3 ; seed et jeu de démonstration (étape 3.1) ; cahier des charges v1.19 (sections 3.3, 7, 8, 11 et 13).
- **Statut** : intégrée au cahier des charges v1.19

## D-033 — Ventilation des activités à cheval sur plusieurs périodes
- **Date** : 17/11/2026
- **Origine** : projet Claude
- **Contexte** : J3, étape 3.0. Section 3.8 (hypothèse de ventilation) et point ouvert de la section 11. Depuis le J1, une activité est rattachée en entier à la période où elle commence (règle provisoire, D-015). Le porteur ne connaît pas de règle du SDIS sur ce point.
- **Décision** :
  - Durées d'astreinte : les durées déclarée, déduite et nette d'une astreinte sont ventilées sur chaque période qu'elle traverse, par découpage exact de ses plages aux limites de période en heure de Paris : minuit pour le jour, lundi 0 h pour la semaine ISO, le 1er à 0 h pour le mois. Chaque période reçoit les heures qui s'y déroulent (changement d'heure compris).
  - Montants (règle PROVISOIRE) : le montant d'une activité, astreinte comprise, est rattaché en entier à la période de sa date de début et calculé avec le taux en vigueur à cette date (section 3.5).
  - Autres activités : rattachées en entier à la période de leur date de début (nombre, durée, montant).
  - Les écrans de restitution signalent les astreintes dont les heures sont réparties sur plusieurs périodes alors que le montant est rattaché à la période de début.
  - À revoir en fin de projet, au plus tard avant l'ouverture aux collègues (J5), si possible avec une règle du SDIS : rattachement des montants à cheval sur deux périodes, et taux appliqué à une activité qui traverse une date de changement de taux ou de grade.
- **Conséquences** : module de regroupement par période (étape 3.1, module pur et tests, dont le changement d'heure) ; spécifications des écrans v1.3 ; précise la règle provisoire de D-015 pour les durées d'astreinte ; cahier des charges v1.20 (sections 3.8, 11 et 13) ; docs/avancement.md (point en attente).
- **Statut** : intégrée au cahier des charges v1.20

## D-034 — Comptage des interventions en anomalie
- **Date** : 17/11/2026
- **Origine** : projet Claude
- **Contexte** : J3, étape 3.0, spécification de l'accueil. D-011 : les totaux, durées comme montants, ne comptent que les activités au statut « ok ». Une intervention en anomalie (par exemple « taux manquant ») a pourtant bien eu lieu : l'exclure fausserait le nombre d'interventions.
- **Décision** :
  - Le nombre d'interventions (natures « est une intervention », D-032) compte toutes les interventions de la période, quel que soit leur statut.
  - Les interventions en anomalie sont identifiables visuellement partout où ce nombre est affiché (accueil, détail par nature, restitutions) : chiffre mis en évidence comme une anomalie (par exemple en rouge) et nombre d'anomalies indiqué (« dont 1 en anomalie »).
  - Exception limitée au comptage : les durées et les montants des interventions en anomalie restent exclus des totaux (D-011).
- **Conséquences** : module de regroupement (étape 3.1) ; spécifications des écrans v1.3 ; cahier des charges v1.21 (sections 3.5, 3.8 et 13).
- **Statut** : intégrée au cahier des charges v1.21
