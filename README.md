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

Les e-mails envoyés par Supabase local (réinitialisation du mot de passe) ne partent
pas : ils arrivent dans **Mailpit**, http://127.0.0.1:54324.

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

### Données de test (seed)

`supabase/seed.sql` est joué après les migrations par `npx supabase db reset`,
**sur la base locale uniquement**. Il ne doit jamais être appliqué en production.
Tout y est **fictif** :

- les 6 natures de la liste initiale (seule « Astreinte » est une astreinte) ;
- 3 grades : Sapeur, Caporal, Sergent ;
- une grille de taux complète au 01/01/2025, puis de nouveaux taux d'astreinte et
  d'intervention au 01/07/2026. **Ces taux sont inventés** (valeurs rondes) et ne
  correspondent à aucun barème réel ;
- un compte de test, `demo@example.com` / `demo-spv-local`, Sapeur depuis le
  01/01/2025 puis Caporal au 01/07/2026.

Après un `db reset`, on peut donc se connecter directement avec ce compte sur
http://localhost:5173.

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
| `npm run test:rls` | Sécurité de la base (`tests/rls/`) : isolation des données entre utilisateurs, référentiel en lecture seule, rôle protégé, visiteur non connecté refusé, contraintes, refus du chevauchement de deux astreintes (D-010). Passe par l'API avec la clé publique, comme l'application. |
| `npm run test:e2e` | Parcours Playwright (`tests/e2e/`) sur l'application buildée (`vite preview`, port 4173), en format ordinateur et smartphone (Pixel 7). Première fois : `npx playwright install chromium`. Rapport : `npx playwright show-report`. |

La base des tests RLS est lue dans `SUPABASE_DB_URL`, à défaut
`postgresql://postgres:postgres@127.0.0.1:54322/postgres` (valeur de
`npx supabase status`).

**Contrôle manuel de la réinitialisation du mot de passe** : sur l'écran de
connexion, « Mot de passe oublié », saisir l'e-mail d'un compte local ; ouvrir
l'e-mail dans Mailpit (http://127.0.0.1:54324) et cliquer sur le lien ; choisir un
nouveau mot de passe ; l'écran connecté s'affiche. Vérifier ensuite, après
déconnexion, que l'ancien mot de passe est refusé et le nouveau accepté.

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
