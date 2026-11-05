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

## Migrations

Migrations SQL versionnées dans `supabase/migrations/`, noms de tables et colonnes
conformes à la section 7 du cahier des charges. *(À compléter au jalon 0.3.)*

## Sauvegarde et restauration

*(À compléter au jalon 4 : export hebdomadaire `pg_dump`, conservation des 8 dernières
versions, test de restauration sur base vide.)*

## Jalons

- [ ] J0 · Socle — 0.1 initialisation ✔ · 0.2 UI + PWA · 0.3 schéma + RLS · 0.4 auth + tests
- [ ] J1 · MVP personnel (moteur de calcul et tests d'abord)
- [ ] J2 · Référentiel et administration
- [ ] J3 · Restitutions
- [ ] J4 · Mise en production
- [ ] J5 · Ouverture aux collègues
