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
| `npx supabase start` / `stop` | Supabase local |
| `npx supabase db reset` | Recrée la base locale et rejoue les migrations |

## Base de données

Migrations SQL versionnées dans `supabase/migrations/` (nom horodaté généré par
`npx supabase migration new <nom>`), noms de tables et colonnes conformes à la
section 7 du cahier des charges. La première, `…_init_schema.sql`, est la
« migration 0001 » : 6 tables, contraintes, index, triggers et Row Level Security.
Aucune donnée de référence n'est fournie (ni nature, ni grade, ni taux) : le
référentiel est saisi par l'administrateur.

```bash
npx supabase db reset       # recrée la base locale et rejoue toutes les migrations
npx supabase gen types typescript --local > src/types/database.ts   # régénère les types
```

Après toute modification du schéma, régénérer `src/types/database.ts` et le committer
avec la migration.

### Promotion du premier administrateur

Tout compte créé reçoit le rôle `user` (profil créé automatiquement à l'inscription).
Pour promouvoir le premier administrateur, après sa première inscription, exécuter
dans le Studio (SQL Editor, http://127.0.0.1:54323 en local) :

```sql
update profiles set role = 'admin' where id = '<uuid du compte>';
```

L'uuid se lit dans Authentication > Users. Depuis l'application, seul un
administrateur peut modifier le rôle ou le statut actif d'un profil.

### Vérification manuelle

`supabase/tests/verification_0_3.sql` vérifie les contraintes et la RLS (deux
utilisateurs simulés, un administrateur, un anonyme) dans une transaction annulée :

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/verification_0_3.sql
```

ou coller le fichier dans le SQL Editor du Studio. Résultat attendu : une suite de
messages « OK … » puis « Tous les tests 0.3 sont passés ».

## Sauvegarde et restauration

*(À compléter au jalon 4 : export hebdomadaire `pg_dump`, conservation des 8 dernières
versions, test de restauration sur base vide.)*

## Jalons

- [ ] J0 · Socle — 0.1 initialisation ✔ · 0.2 UI + PWA ✔ · 0.3 schéma + RLS ✔ · 0.4 auth + tests
- [ ] J1 · MVP personnel (moteur de calcul et tests d'abord)
- [ ] J2 · Référentiel et administration
- [ ] J3 · Restitutions
- [ ] J4 · Mise en production
- [ ] J5 · Ouverture aux collègues
