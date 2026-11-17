-- =============================================================================
-- Migration 0004 — identification des interventions (D-032, J3 étape 3.1)
--
-- * activity_types.est_intervention : indicateur géré par l'administrateur,
--   qui ne sert qu'aux restitutions (comptage, mise en avant, catégorie
--   « Interventions ») ; aucun effet sur les durées ni sur les montants.
--   Modifiable à tout moment, y compris pour une nature déjà utilisée : il
--   n'est donc PAS concerné par le verrou de « est une astreinte » (D-022).
-- * Une nature n'est jamais à la fois une astreinte et une intervention :
--   contrainte check nommée, reconnue par l'application (src/data/erreurs.ts).
--
-- Row Level Security inchangée : les policies de activity_types (lecture pour
-- les connectés, écriture par l'administrateur) couvrent la nouvelle colonne.
-- Aucune nouvelle table ni fonction : rien à retirer au rôle anon (D-009).
-- =============================================================================

alter table public.activity_types
  add column est_intervention boolean not null default false;

alter table public.activity_types
  add constraint activity_types_astreinte_ou_intervention
  check (not (est_astreinte and est_intervention));
