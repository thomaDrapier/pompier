# Journal des décisions

Ce journal trace chaque décision structurante du projet : **quoi**, **pourquoi**, et
**ce qui a été écarté**. Il est la mémoire commune entre le projet Claude (conception)
et Claude Code (exécution). Une décision prise ailleurs n'existe pas tant qu'elle n'est
pas écrite ici (ou dans `CLAUDE.md` / le cahier des charges).

**Règles d'écriture**
- On n'efface jamais une décision : si elle change, on ajoute une nouvelle entrée qui la
  remplace, et on passe l'ancienne au statut « Remplacée par D-xxx ».
- Une entrée = une décision. Courte. Datée.
- Statuts : `Validée` · `Proposée` (en attente d'accord) · `Remplacée par D-xxx`.

---

## D-001 — Stack technique
- **Date** : 31/10/2026 · **Statut** : Validée · **Source** : cahier des charges v1.2, §6
- **Décision** : Supabase (PostgreSQL, Auth, RLS, API) · React + TypeScript strict + Vite ·
  vite-plugin-pwa · Tailwind CSS + shadcn/ui · Recharts · TanStack Query · date-fns
  (Europe/Paris) · Vitest · Playwright.
- **Pourquoi** : technologies standard et portables, coût d'hébergement nul, bonne
  prise en charge PWA, RLS native pour l'isolation des données.
- **Écarté** : application native iOS/Android (hors périmètre v1).

## D-002 — Supabase en local pendant la phase de test
- **Date** : 03/11/2026 · **Statut** : Validée · **Source** : cahier des charges v1.2, §6 et §6.3
- **Décision** : CLI Supabase installée comme dépendance de dev (version figée), Supabase
  exécuté dans Docker sur le poste ; passage à l'offre cloud gratuite (région UE) au J4.
- **Pourquoi** : développer sans coût ni donnée réelle, base recréable à volonté
  (`npx supabase db reset`), même schéma qu'en production.

## D-003 — Moteur de calcul pur, montants calculés à la lecture
- **Date** : 03/11/2026 · **Statut** : Validée · **Source** : cahier des charges v1.2, §3.4, §3.5, §6
- **Décision** : déduction des astreintes et résolution des taux dans `src/engine/`, sans
  React ni Supabase, couvert par Vitest. Montants et durées nettes jamais stockés.
- **Pourquoi** : les calculs sont le cœur de la valeur ; un module pur se teste
  facilement, et calculer à la lecture garantit la cohérence après toute modification.
- **Écarté (pour l'instant)** : vues SQL d'agrégats, à réétudier si les volumes augmentent.

## D-004 — Le dépôt Git est la source de vérité
- **Date** : 05/11/2026 · **Statut** : Validée · **Source** : échange avec le porteur du projet
- **Décision** : la conception se fait dans le projet Claude (claude.ai), l'exécution dans
  Claude Code. Toute décision validée dans le projet Claude est reportée dans ce journal
  ou dans `CLAUDE.md` avant d'être codée. Le projet Claude lit le dépôt via
  l'intégration GitHub.
- **Pourquoi** : Claude Code n'a pas accès au projet Claude ; sans support écrit commun,
  les deux divergent.

## D-005 — Une branche et une Pull Request par étape
- **Date** : 05/11/2026 · **Statut** : Validée · **Source** : échange avec le porteur du projet
- **Décision** : chaque étape est réalisée sur une branche dédiée, relue via une Pull
  Request sur GitHub, puis fusionnée dans `main`. `main` reste toujours fonctionnelle.
- **Pourquoi** : chaque changement est isolé, relu et réversible ; c'est aussi un objectif
  d'apprentissage du porteur (gestion de projet en mode agentique).
- **Écarté** : commits directs sur `main` (seul le commit initial J0.1 l'a été).

---

## Points ouverts (à trancher, voir cahier des charges §11)

Ces points ne sont **pas** des décisions : ils seront transformés en entrées D-xxx une
fois tranchés.

- Liste définitive des natures d'activité et lesquelles sont des astreintes.
- Qui renseigne le grade et ses promotions (hypothèse : l'utilisateur).
- Règle d'arrondi (hypothèse : prorata à la minute, arrondi au centime par activité).
- Ventilation d'une activité à cheval sur deux semaines ou deux mois.
- Répartition de la durée nette entre deux astreintes qui se chevauchent.
- Plafonds, majorations, forfaits propres au SDIS.
- Mode de création des comptes des collègues.
- Moyen de tester l'installation de la PWA sur smartphone (HTTPS).
