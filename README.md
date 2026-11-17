# PWA SPV — suivi des activités et indemnités des sapeurs-pompiers volontaires

Saisie minimaliste (début, fin, nature) et calcul automatique des astreintes nettes
et de la rémunération.

Documents de référence :
- [`docs/cahier_des_charges.md`](docs/cahier_des_charges.md) : cahier des charges, source de référence unique ;
- [`docs/decisions.md`](docs/decisions.md) : journal des décisions ;
- [`docs/Methode_projet_Claude_Claude_Code.pdf`](docs/Methode_projet_Claude_Claude_Code.pdf) :
  méthode de travail entre le projet Claude et Claude Code ;
- [`docs/archives/`](docs/archives/) : anciennes versions figées (cahier des charges v1.2 en PDF).

> Les montants affichés sont indicatifs et ne remplacent pas les relevés officiels du SDIS.

## Décisions d'architecture

- **Base / Auth / API** : Supabase (PostgreSQL + Row Level Security). En local via la
  CLI (Docker) pendant la phase de test, puis offre cloud gratuite en région UE.
- **Frontend** : React + TypeScript strict + Vite, packagé en PWA (vite-plugin-pwa).
- **UI** : Tailwind CSS + shadcn/ui ; graphiques Recharts ; données via TanStack Query.
- **Dates** : date-fns, fuseau Europe/Paris (changement d'heure géré et testé).
- **Calculs** : moteur pur dans `src/engine/` (sans React ni Supabase), testé avec
  Vitest. Montants et durées nettes calculés à la lecture, jamais stockés.
- **Référentiel unique** (`grades`, `activity_types`, `reference_rates`) : aucun taux
  en dur ni personnalisé ; taux à date d'effet, modifiable par l'administrateur seul.

## Installation locale

Prérequis : Node.js LTS (22 ou 24), Git, Docker Desktop démarré.

```bash
npm install
npx supabase start          # lance Postgres, Auth, API, Studio, boîte mail de test
cp .env.example .env.local  # puis y coller la clé anon affichée par la commande précédente
npm run dev
```

`.env.local` n'est pas versionné. Il ne contient que `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY` ; la clé `service_role` / secret n'est jamais côté client.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build && npm run preview` | Tester la PWA (service worker actif seulement en build) |
| `npm run lint` | Analyse statique (oxlint) |
| `npm run test` / `test:watch` | Tests unitaires (Vitest) |
| `npm run test:rls` | Tests de sécurité de la base (Supabase local requis) |
| `npm run test:e2e` | Tests de parcours (Playwright, Supabase local requis) |
| `npx supabase start` / `stop` | Supabase local |
| `npx supabase db reset` | Recrée la base locale, rejoue les migrations puis le seed (données fictives) |

## Créer un compte en local

L'application n'a pas d'écran d'inscription (création des comptes : point ouvert,
cahier des charges section 11). En local, créer un compte dans le Studio
(http://127.0.0.1:54323) : **Authentication > Users > Add user > Create new user**,
avec une adresse fictive (par exemple `prenom@example.test`) et un mot de passe
d'au moins 8 caractères, en cochant « Auto Confirm User ». Se connecter ensuite sur
http://localhost:5173 (`npm run dev`).

**Grade de l'utilisateur** : il se renseigne dans l'application, écran **Paramètres**
(`/parametres`, menu « Paramètres ») : grade et date d'effet, puis historique des
promotions (D-017). Il n'est plus nécessaire de saisir `user_grade_history` dans le
Studio. Tant qu'aucun grade n'est renseigné, les activités sont en « taux manquant ».

Les e-mails envoyés par Supabase local (réinitialisation du mot de passe, y compris
« Changer le mot de passe » dans Paramètres) ne partent pas : ils arrivent dans
**Mailpit**, http://127.0.0.1:54324.

## Base de données

Migrations SQL versionnées dans `supabase/migrations/` (nom horodaté généré par
`npx supabase migration new <nom>`), noms de tables et colonnes conformes à la
section 7 du cahier des charges. La première, `…_init_schema.sql`, est la
« migration 0001 » : 6 tables, contraintes, index, triggers et Row Level Security.
Les migrations ne contiennent aucune donnée de référence (ni nature, ni grade, ni
taux) : en production, le référentiel est saisi par l'administrateur.

La seconde, `…_chevauchement_astreintes.sql`, ajoute le contrôle en base de la
décision D-010 : un trigger refuse l'enregistrement d'une astreinte qui chevauche
une autre astreinte du même utilisateur (les astreintes contiguës sont acceptées).
L'erreur porte le code `23P01` et le message `chevauchement_astreintes`.

La troisième, `…_referentiel_j2.sql` (J2, étape 2.1), complète le référentiel :

- **archivage des grades** : colonne `grades.actif` (vrai par défaut, D-018). Le
  filtre « archivés non proposés » est fait par l'interface, pas par la base ;
- **contraintes nommées**, que l'application reconnaît à leur code SQLSTATE et à
  leur nom (`src/data/erreurs.ts`) :

  | Règle | Nom | Code |
  | --- | --- | --- |
  | Libellé de grade unique, sans distinction de casse, archivés compris (D-024) | `grades_libelle_unique_ci` | `23505` |
  | Libellé de nature unique, sans distinction de casse (D-026) | `activity_types_libelle_unique_ci` | `23505` |
  | Code de nature unique, sans distinction de casse (D-023) | `activity_types_code_unique_ci` | `23505` |
  | Un seul taux par (grade, nature, date d'effet) | `reference_rates_grade_nature_date_unique` | `23505` |
  | Une seule date d'effet par utilisateur dans l'historique de grades (D-028) | `user_grade_history_user_date_unique` | `23505` |
  | Taux horaire positif ou nul (D-027) | `reference_rates_taux_positif_ou_nul` | `23514` |

  Les unicités insensibles à la casse sont des index uniques sur `lower(...)`. La
  suppression d'un grade ou d'une nature déjà utilisé est refusée par les clés
  étrangères (`23503`) : il faut l'archiver (D-018) ;
- **verrou de « est une astreinte »** (D-022) : le trigger
  `activity_types_verrouiller_est_astreinte` refuse de changer `est_astreinte`
  dès qu'une activité, de n'importe quel utilisateur, utilise la nature. Erreur :
  code `SPV01` (propre à l'application), message `est_astreinte_verrouille`, sans
  autre donnée. Libellé, code et ordre restent modifiables ;
- **fonction `nature_utilisee(p_activity_type_id uuid) returns boolean`** : vraie si
  une activité utilise la nature. Réservée à l'administrateur (refus `42501`
  sinon), exécutable par `authenticated` seulement, jamais par `anon`. Elle ne
  renvoie qu'un booléen.

Le verrou et `nature_utilisee` sont en `security definer` (search_path vide) : ils
doivent voir les activités de tous les utilisateurs, que la RLS cache à
l'administrateur, sans en révéler aucune (D-029). Le trigger de D-010, lui, reste
en `security invoker` (D-015).

La quatrième, `…_interventions.sql` (J3, étape 3.1), ajoute l'indicateur
`activity_types.est_intervention` (faux par défaut, D-032). Il ne sert qu'aux
restitutions et reste modifiable à tout moment. La contrainte
`activity_types_astreinte_ou_intervention` (code `23514`) interdit qu'une nature
soit à la fois une astreinte et une intervention.

### Données de test (seed)

`supabase/seed.sql` est joué après les migrations par `npx supabase db reset`,
**sur la base locale uniquement**. Il ne doit jamais être appliqué en production.
Tout y est **fictif** :

- 9 natures : Astreinte (seule astreinte) ; Intervention VSAV, Intervention FPT,
  Intervention VRID (cochées « est une intervention », D-032) ; Garde, Manœuvre,
  Formation, Administratif ; « Réunion (démo, sans taux) », volontairement sans
  aucun taux, pour produire des « taux manquant » ;
- 3 grades : Sapeur, Caporal, Sergent ;
- une grille de taux complète au 01/01/2025, puis de nouveaux taux d'astreinte et
  d'intervention au 01/07/2026 ; les trois natures d'intervention ont des taux
  identiques. **Ces taux sont inventés** (valeurs rondes) et ne correspondent à
  aucun barème réel ;
- un compte de test, `demo@example.com` / `demo-spv-local`, avec un **jeu de
  démonstration** (ci-dessous) ;
- un compte administrateur de test, `admin@example.com` / `admin-spv-local`
  (rôle `admin`, actif, sans historique de grade), pour les écrans
  d'administration.

Après un `db reset`, on peut donc se connecter directement avec ces comptes sur
http://localhost:5173. Comme le reste du seed, ils ne doivent **jamais** exister en
production (point à traiter au J4).

**Jeu de démonstration de `demo@example.com`** (section 6 du seed). Les dates sont
calculées à partir du jour du `db reset`, en heure de Paris : il couvre les 3 mois
précédents et le mois en cours, jusqu'au moment du reset (rien dans le futur), et
se rejoue sans erreur à toute date. Il contient :

- un historique de grade relatif : aucun grade pendant les 7 premiers jours (ces
  activités, astreintes et interventions comprises, sont en « taux manquant »),
  puis Sapeur, puis promotion Caporal au 15 du mois précédent ;
- chaque semaine : astreintes de nuit (mardi et jeudi, 18 h → 8 h), de week-end
  (samedi 8 h → dimanche 8 h, donc la nuit d'un changement d'heure si la période
  en contient un) et du dimanche 18 h au lundi 8 h (à cheval sur deux semaines) ;
  interventions VSAV (les plus nombreuses), FPT et VRID, pendant et hors astreinte ;
  garde ou formation, manœuvre, administratif ; une réunion sans taux toutes les
  trois semaines ;
- une astreinte à cheval sur deux mois (la nuit du dernier jour du mois M-2) ;
- aucune astreinte en chevauchement : une astreinte n'est créée que si elle ne
  chevauche aucune astreinte déjà créée.

Les tests automatisés ne dépendent pas de ces données : ils créent leurs propres
comptes.

```bash
npx supabase db reset       # recrée la base locale et rejoue toutes les migrations
npx supabase gen types typescript --local > src/types/database.ts   # régénère les types
npx supabase gen types typescript --local | diff - src/types/database.ts  # contrôle : ne doit rien afficher
```

**Après chaque migration**, relancer `db reset` puis la génération des types, et
committer `src/types/database.ts` avec la migration. Le fichier est généré tel quel
(non reformaté) et figé en fins de ligne LF (`.gitattributes`).

> Lancer ces commandes dans **Git Bash** (ou un terminal bash), pas dans Windows
> PowerShell : la redirection `>` de PowerShell 5.1 écrit le fichier en UTF-16, que
> TypeScript et git ne lisent pas correctement.

### Promotion du premier administrateur

Tout compte créé reçoit le rôle `user` (profil créé automatiquement à l'inscription).
Pour promouvoir le premier administrateur, après sa première inscription, exécuter
dans le Studio (SQL Editor, http://127.0.0.1:54323 en local) :

```sql
update profiles set role = 'admin' where id = '<uuid du compte>';
```

L'uuid se lit dans Authentication > Users. Depuis l'application, seul un
administrateur peut modifier le rôle ou le statut actif d'un profil.

Les contraintes et la RLS sont vérifiées automatiquement par `npm run test:rls`
(voir « Tests »).

## Tests

Prérequis pour `test:rls` et `test:e2e` : **Docker Desktop démarré** et **Supabase
local lancé** (`npx supabase start`), `.env.local` rempli. Ces tests créent leurs
propres comptes fictifs (`…@example.test`) et les suppriment à la fin ; ils refusent
de s'exécuter si l'API ou la base visée n'est pas locale (127.0.0.1 / localhost).

| Commande | Contenu |
| --- | --- |
| `npm run test` | Tests unitaires Vitest (`src/**/*.test.ts(x)`), dans un DOM simulé, sans Supabase. |
| `npm run test:rls` | Sécurité de la base (`tests/rls/`) : isolation des données entre utilisateurs, référentiel en lecture seule, rôle protégé, visiteur non connecté refusé, contraintes, refus du chevauchement de deux astreintes (D-010), requêtes de l'application (`src/data/requetes.ts`), règles du référentiel (`tests/rls/referentiel.test.ts` : doublons, taux négatif, suppression d'un élément utilisé, verrou de « est une astreinte », `nature_utilisee`, historique de grades, lecture du rôle, indicateur « est une intervention »). Passe par l'API avec la clé publique, comme l'application. |
| `npm run test:e2e` | Parcours Playwright (`tests/e2e/`) sur l'application buildée (`vite preview`, port 4173), en format ordinateur et smartphone (Pixel 7) : authentification, réinitialisation du mot de passe par le lien reçu dans Mailpit, liste des activités, saisie, modification et suppression ; administration (menu et accès réservé, grades, natures, grille de taux, natures archivées dans la saisie) ; paramètres (grade et historique, recalcul des montants, taux du grade, « Changer le mot de passe » vérifié dans Mailpit). Les tests d'activités créent leurs comptes et leur attribuent le grade « Sapeur » du seed ; les tests d'administration créent leurs propres comptes administrateurs et un référentiel fictif suffixé, supprimé à la fin, et vérifient la connexion du compte `admin@example.com` : **le seed doit être présent** (`npx supabase db reset`). Première fois : `npx playwright install chromium`. Rapport : `npx playwright show-report`. |

La base des tests RLS est lue dans `SUPABASE_DB_URL`, à défaut
`postgresql://postgres:postgres@127.0.0.1:54322/postgres` (valeur de
`npx supabase status`).

**Réinitialisation du mot de passe** : le parcours complet est testé par
`npm run test:e2e`. Pour le refaire à la main : sur l'écran de connexion,
« Mot de passe oublié », saisir l'e-mail d'un compte local ; ouvrir l'e-mail dans
Mailpit (http://127.0.0.1:54324) et cliquer sur le lien ; choisir un nouveau mot
de passe ; la liste des activités s'affiche. Vérifier ensuite, après déconnexion,
que l'ancien mot de passe est refusé et le nouveau accepté.

## Adresses de l'application

Routage côté navigateur avec React Router (D-013) :

| Adresse | Écran |
| --- | --- |
| `/connexion`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe` | Authentification |
| `/activites?mois=AAAA-MM&nature=<id>` | Liste des activités d'un mois, filtre facultatif |
| `/activites/nouvelle`, `/activites/<id>` | Saisie, modification |
| `/parametres` | Paramètres : grade et historique de grades, taux du grade, compte |
| `/admin` | Administration : redirige vers `/admin/grades` |
| `/admin/grades`, `/admin/natures` | Administration des grades, des natures |
| `/admin/taux?grade=<id>&nature=<id>` | Grille de taux d'un grade ; avec `nature`, historique du couple |

Les adresses d'activités, de paramètres et d'administration sont protégées : sans session,
l'application renvoie vers `/connexion`, puis ramène à l'adresse demandée. Les
adresses `/admin/…` affichent « Accès réservé à l'administrateur » à tout autre
utilisateur (la base refuse de toute façon ses écritures, RLS). En production, l'hébergeur statique
devra renvoyer `index.html` pour toute adresse (point à traiter au J4).

## Sauvegarde et restauration

*(À compléter au jalon 4 : export hebdomadaire `pg_dump`, conservation des 8 dernières
versions, test de restauration sur base vide.)*

## Jalons

- [x] J0 · Socle — 0.1 initialisation ✔ · 0.2 UI + PWA ✔ · 0.3 schéma + RLS ✔ · 0.4 auth + tests ✔
- [ ] J1 · MVP personnel (moteur de calcul et tests d'abord)
- [ ] J2 · Référentiel et administration
- [ ] J3 · Restitutions
- [ ] J4 · Mise en production
- [ ] J5 · Ouverture aux collègues
