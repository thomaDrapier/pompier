-- =============================================================================
-- Migration 0001 — schéma initial (cahier des charges, section 7)
-- 6 tables, contraintes, index, triggers et Row Level Security (RLS).
-- Aucune donnée de référence (ni nature, ni grade, ni taux) et aucun compte :
-- le référentiel est saisi par l'administrateur, jamais inventé.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

-- Un utilisateur de l'application, lié 1-pour-1 à un compte d'authentification.
-- Supprimer le compte supprime le profil (et, en cascade, toutes ses données).
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  nom_affichage text,
  role          text not null default 'user' check (role in ('user', 'admin')),
  actif         boolean not null default true
);

-- Référentiel : les grades (communs à tous).
create table public.grades (
  id      uuid primary key default gen_random_uuid(),
  libelle text not null unique,
  ordre   int  not null
);

-- Référentiel : les natures d'activité (communes à tous).
-- est_astreinte : une astreinte voit sa durée réduite des autres activités.
create table public.activity_types (
  id            uuid primary key default gen_random_uuid(),
  code          text    not null unique,
  libelle       text    not null,
  est_astreinte boolean not null default false,
  actif         boolean not null default true,
  ordre         int     not null
);

-- Référentiel : taux horaire par (grade, nature), à date d'effet.
-- Règle : on ajoute une ligne pour un nouveau taux, on n'écrase jamais
-- l'historique ; un seul taux par (grade, nature, date d'effet).
create table public.reference_rates (
  id               uuid primary key default gen_random_uuid(),
  grade_id         uuid not null references public.grades (id) on delete restrict,
  activity_type_id uuid not null references public.activity_types (id) on delete restrict,
  taux_horaire     numeric(10, 2) not null check (taux_horaire >= 0),
  date_effet       date not null,
  unique (grade_id, activity_type_id, date_effet)
);

-- Grade d'un utilisateur au fil du temps (une ligne par promotion).
-- Le grade applicable à une activité est celui en vigueur à sa date de début.
create table public.user_grade_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  grade_id   uuid not null references public.grades (id) on delete restrict,
  date_effet date not null,
  unique (user_id, date_effet)
);

-- Les activités saisies. Montants et durées nettes ne sont PAS stockés :
-- ils sont calculés à la lecture par le moteur (src/engine/).
create table public.activities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid()
                     references public.profiles (id) on delete cascade,
  activity_type_id uuid not null references public.activity_types (id) on delete restrict,
  debut            timestamptz not null,
  fin              timestamptz not null,
  note             text,
  cree_le          timestamptz not null default now(),
  modifie_le       timestamptz not null default now(),
  -- Règle : une activité a une durée strictement positive.
  check (fin > debut)
);


-- -----------------------------------------------------------------------------
-- 2. Index
-- -----------------------------------------------------------------------------

-- Lecture des activités d'un utilisateur par période (cahier des charges, section 7).
create index activities_user_id_debut_idx on public.activities (user_id, debut);

-- Index sur les clés étrangères non couvertes par un index existant
-- (les index « unique » couvrent déjà reference_rates.grade_id et
-- user_grade_history.user_id, l'index ci-dessus couvre activities.user_id).
create index activities_activity_type_id_idx       on public.activities (activity_type_id);
create index reference_rates_activity_type_id_idx  on public.reference_rates (activity_type_id);
create index user_grade_history_grade_id_idx       on public.user_grade_history (grade_id);


-- -----------------------------------------------------------------------------
-- 3. Fonctions et triggers
-- -----------------------------------------------------------------------------

-- Vrai si l'utilisateur connecté est un administrateur actif.
-- security definer : lit profiles sans passer par la RLS (évite une récursion
-- dans les policies de profiles). search_path vide : noms entièrement qualifiés.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.actif
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Création automatique du profil (rôle 'user') à l'inscription d'un compte.
-- C'est le SEUL moyen de créer un profil : aucune policy insert sur profiles.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Protection du rôle et du statut actif : un utilisateur de l'application
-- (rôles authenticated / anon) ne peut modifier role ou actif que s'il est
-- administrateur. Les accès d'administration de la base (postgres via le
-- Studio ou psql, service_role côté serveur) restent autorisés : c'est ainsi
-- qu'est promu le premier administrateur.
-- Pas de security definer : current_user doit refléter l'appelant.
create function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.actif is distinct from old.actif)
     and current_user in ('authenticated', 'anon')
     and not public.is_admin()
  then
    raise exception 'Seul un administrateur peut modifier le rôle ou le statut actif d''un profil'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Horodatage automatique de la dernière modification d'une activité.
create function public.set_modifie_le()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.modifie_le := now();
  return new;
end;
$$;

create trigger activities_set_modifie_le
  before update on public.activities
  for each row execute function public.set_modifie_le();


-- -----------------------------------------------------------------------------
-- 4. Droits et Row Level Security
-- -----------------------------------------------------------------------------
-- Principe : RLS activée partout ; policies réservées au rôle authenticated ;
-- le rôle anon (visiteur non connecté) n'a aucun droit sur ces tables.
-- (select auth.uid()) est évalué une fois par requête et non par ligne.

revoke all on table
  public.profiles, public.grades, public.activity_types,
  public.reference_rates, public.user_grade_history, public.activities
from anon;

alter table public.profiles           enable row level security;
alter table public.grades             enable row level security;
alter table public.activity_types     enable row level security;
alter table public.reference_rates    enable row level security;
alter table public.user_grade_history enable row level security;
alter table public.activities         enable row level security;

-- ---- profiles ---------------------------------------------------------------
-- Lecture : son propre profil ; l'administrateur voit tous les profils.
create policy "profiles : lecture de son profil ou admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Modification : son propre profil (nom_affichage) ; l'administrateur peut
-- modifier tous les profils. Le changement de role / actif est en plus
-- contrôlé par le trigger profiles_protect_role.
create policy "profiles : modification de son profil ou admin"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- Pas de policy insert ni delete : création par trigger uniquement,
-- suppression via la suppression du compte (cascade).

-- ---- Référentiel : grades, activity_types, reference_rates ------------------
-- Référentiel unique et commun : lecture pour tout utilisateur connecté,
-- écriture réservée à l'administrateur.

create policy "grades : lecture pour les connectés"
  on public.grades for select to authenticated
  using (true);
create policy "grades : ajout par l'admin"
  on public.grades for insert to authenticated
  with check ((select public.is_admin()));
create policy "grades : modification par l'admin"
  on public.grades for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "grades : suppression par l'admin"
  on public.grades for delete to authenticated
  using ((select public.is_admin()));

create policy "activity_types : lecture pour les connectés"
  on public.activity_types for select to authenticated
  using (true);
create policy "activity_types : ajout par l'admin"
  on public.activity_types for insert to authenticated
  with check ((select public.is_admin()));
create policy "activity_types : modification par l'admin"
  on public.activity_types for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "activity_types : suppression par l'admin"
  on public.activity_types for delete to authenticated
  using ((select public.is_admin()));

create policy "reference_rates : lecture pour les connectés"
  on public.reference_rates for select to authenticated
  using (true);
create policy "reference_rates : ajout par l'admin"
  on public.reference_rates for insert to authenticated
  with check ((select public.is_admin()));
create policy "reference_rates : modification par l'admin"
  on public.reference_rates for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "reference_rates : suppression par l'admin"
  on public.reference_rates for delete to authenticated
  using ((select public.is_admin()));

-- ---- Données personnelles : user_grade_history, activities -----------------
-- Chacun ne lit et n'écrit que ses propres lignes. L'administrateur n'a AUCUN
-- accès aux lignes des autres utilisateurs.

create policy "user_grade_history : lecture de ses lignes"
  on public.user_grade_history for select to authenticated
  using (user_id = (select auth.uid()));
create policy "user_grade_history : ajout de ses lignes"
  on public.user_grade_history for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "user_grade_history : modification de ses lignes"
  on public.user_grade_history for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "user_grade_history : suppression de ses lignes"
  on public.user_grade_history for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "activities : lecture de ses lignes"
  on public.activities for select to authenticated
  using (user_id = (select auth.uid()));
create policy "activities : ajout de ses lignes"
  on public.activities for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "activities : modification de ses lignes"
  on public.activities for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "activities : suppression de ses lignes"
  on public.activities for delete to authenticated
  using (user_id = (select auth.uid()));
