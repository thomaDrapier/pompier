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
