-- =============================================================================
-- Migration 0003 — référentiel du J2 (étape 2.1)
--
-- * grades.actif : archivage des grades (D-018) ;
-- * unicité insensible à la casse du libellé des grades (D-024), du libellé
--   des natures (D-026) et du code des natures (D-023), actifs comme archivés ;
-- * taux horaire positif ou nul (D-027) et date d'effet unique dans
--   l'historique de grades d'un utilisateur (D-028) : ces deux contraintes
--   existent depuis la migration 0001, elles sont seulement renommées ;
-- * verrou de l'indicateur « est une astreinte » (D-022) et fonction
--   nature_utilisee() pour l'écran d'administration des natures.
--
-- Chaque contrainte et chaque index porte un nom explicite : l'application
-- reconnaît une erreur à son code SQLSTATE et au nom de la contrainte
-- (src/data/erreurs.ts). Les choix techniques sont consignés dans D-029.
--
-- Le seed (supabase/seed.sql) respecte toutes ces contraintes.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Archivage des grades (D-018)
--    Un grade archivé n'est plus proposé dans l'interface, mais reste
--    utilisable dans l'historique et sans effet sur le calcul. Le filtre est
--    fait par l'interface, pas par la base.
-- -----------------------------------------------------------------------------
alter table public.grades
  add column actif boolean not null default true;


-- -----------------------------------------------------------------------------
-- 2. Unicité insensible à la casse, actifs comme archivés
--    Un index unique sur lower(...) refuse « Sapeur » si « sapeur » existe.
--    Il porte sur toutes les lignes (sans filtre sur actif) : une réactivation
--    ne crée jamais de doublon. Les contraintes « unique » de la migration
--    0001, sensibles à la casse, deviennent inutiles et sont supprimées.
-- -----------------------------------------------------------------------------

-- Libellé des grades (D-024).
alter table public.grades drop constraint grades_libelle_key;
create unique index grades_libelle_unique_ci
  on public.grades (lower(libelle));

-- Libellé des natures (D-026).
create unique index activity_types_libelle_unique_ci
  on public.activity_types (lower(libelle));

-- Code des natures (D-023).
alter table public.activity_types drop constraint activity_types_code_key;
create unique index activity_types_code_unique_ci
  on public.activity_types (lower(code));


-- -----------------------------------------------------------------------------
-- 3. Contraintes existantes, renommées pour être reconnues côté client
-- -----------------------------------------------------------------------------

-- Taux horaire positif ou nul (D-027) : check (taux_horaire >= 0) depuis 0001.
alter table public.reference_rates
  rename constraint reference_rates_taux_horaire_check to reference_rates_taux_positif_ou_nul;

-- Un seul taux par (grade, nature, date d'effet) : unique depuis 0001.
alter table public.reference_rates
  rename constraint reference_rates_grade_id_activity_type_id_date_effet_key
  to reference_rates_grade_nature_date_unique;

-- Une seule ligne par date d'effet dans l'historique d'un utilisateur (D-028) :
-- unique (user_id, date_effet) depuis 0001.
alter table public.user_grade_history
  rename constraint user_grade_history_user_id_date_effet_key
  to user_grade_history_user_date_unique;


-- -----------------------------------------------------------------------------
-- 4. Verrou de l'indicateur « est une astreinte » (D-022)
--    Modifiable tant qu'aucune activité, de QUELQUE utilisateur que ce soit,
--    n'utilise la nature ; verrouillé ensuite.
-- -----------------------------------------------------------------------------

-- security definer (et non invoker, comme le trigger de D-010) : sous la RLS,
-- l'administrateur ne voit pas les activités des autres utilisateurs, et une
-- nature utilisée par eux seuls serait jugée libre. La fonction s'exécute donc
-- avec les droits de son propriétaire, mais ne renvoie AUCUNE donnée
-- d'activité : seulement un refus, au code et au message fixes.
-- search_path vide : tous les noms sont entièrement qualifiés.
create function public.verrouiller_est_astreinte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.est_astreinte is distinct from old.est_astreinte then
    -- Verrou exclusif sur la nature, tenu jusqu'à la fin de la transaction.
    -- Une écriture d'activité en cours sur cette nature (insertion ou
    -- changement de nature) pose un verrou partagé sur la ligne pour sa clé
    -- étrangère : on attend qu'elle se termine, puis la vérification
    -- ci-dessous la voit. Les écritures suivantes attendent la fin de cette
    -- modification. Sans ce verrou, une activité créée au même instant
    -- pourrait échapper à la vérification.
    perform 1
    from public.activity_types t
    where t.id = old.id
    for update;

    if exists (
      select 1
      from public.activities a
      where a.activity_type_id = old.id
    ) then
      -- Code dédié (classe « SPV », propre à l'application) et message stable,
      -- reconnus ensemble par l'interface. Aucune autre donnée.
      raise exception 'est_astreinte_verrouille' using errcode = 'SPV01';
    end if;
  end if;
  return new;
end;
$$;

-- Fonction de trigger : jamais appelée directement par un utilisateur.
revoke execute on function public.verrouiller_est_astreinte() from public, anon, authenticated;

create trigger activity_types_verrouiller_est_astreinte
  before update of est_astreinte on public.activity_types
  for each row execute function public.verrouiller_est_astreinte();


-- -----------------------------------------------------------------------------
-- 5. nature_utilisee() : la nature a-t-elle déjà servi ? (D-022)
--    Permet à l'écran d'administration de griser la case « Est une astreinte »
--    avant toute tentative. Réservée à l'administrateur ; ne renvoie qu'un
--    booléen, jamais une donnée d'activité.
-- -----------------------------------------------------------------------------

-- security definer pour la même raison que le verrou : voir les activités de
-- tous les utilisateurs sans en révéler aucune.
create function public.nature_utilisee(p_activity_type_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;

  return exists (
    select 1
    from public.activities a
    where a.activity_type_id = p_activity_type_id
  );
end;
$$;

-- D-009 : aucun droit pour anon. Supabase accorde par défaut l'exécution des
-- nouvelles fonctions à anon : on la retire explicitement.
revoke execute on function public.nature_utilisee(uuid) from public, anon;
grant execute on function public.nature_utilisee(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 6. Row Level Security : vérifiée, aucune modification nécessaire
--    * grades, activity_types, reference_rates : lecture pour tout utilisateur
--      connecté, écriture par l'administrateur (migration 0001) ; la nouvelle
--      colonne grades.actif est couverte par les mêmes policies ;
--    * user_grade_history : chacun ne lit et n'écrit que ses lignes, avec
--      with check sur user_id (migration 0001) ;
--    * profiles : chacun lit son propre profil, donc son rôle et son statut
--      actif (migration 0001).
--    Aucune nouvelle table : la règle D-009 s'applique ici aux seules fonctions.
-- -----------------------------------------------------------------------------
