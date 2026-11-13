-- =============================================================================
-- Migration 0002 — interdiction du chevauchement de deux astreintes (D-010)
--
-- Règle : deux astreintes d'un même utilisateur ne peuvent pas se chevaucher.
-- Les plages sont semi-ouvertes [debut, fin) : deux astreintes contiguës
-- (fin de l'une = début de l'autre) sont autorisées.
-- Le chevauchement d'une astreinte avec une activité d'une autre nature reste
-- normal et attendu (règle de déduction, cahier des charges 3.4).
--
-- Ce contrôle double celui de l'interface (défense en profondeur).
-- Le passage ultérieur d'une nature au statut « astreinte » n'est PAS bloqué
-- ici : le moteur de calcul signale alors l'anomalie (D-010).
-- =============================================================================

-- security invoker (et non definer) : la vérification s'exécute avec les droits
-- de l'appelant, donc sous sa Row Level Security. Elle ne voit que les lignes de
-- l'utilisateur connecté, qui sont exactement celles à contrôler. Avec
-- security definer, un utilisateur qui tenterait d'insérer une ligne au nom d'un
-- autre recevrait « chevauchement_astreintes » ou une erreur de droits selon le
-- planning de cet autre : ce serait une fuite d'information. Les rôles postgres
-- et service_role ignorent la RLS et contrôlent donc toutes les lignes.
-- search_path vide : tous les noms sont entièrement qualifiés.
create function public.verifier_chevauchement_astreintes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Seules les astreintes sont contrôlées.
  if not exists (
    select 1
    from public.activity_types t
    where t.id = new.activity_type_id
      and t.est_astreinte
  ) then
    return new;
  end if;

  -- Verrou par utilisateur, tenu jusqu'à la fin de la transaction : deux
  -- écritures simultanées d'astreintes du même utilisateur passent l'une après
  -- l'autre. Sans lui, deux insertions lancées en même temps ne se verraient
  -- pas l'une l'autre et pourraient toutes deux réussir. Les autres
  -- utilisateurs ne sont pas ralentis (la clé dépend du user_id).
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 0)
  );

  -- Chevauchement en plages semi-ouvertes : l'autre astreinte commence avant
  -- la fin de celle-ci ET se termine après son début.
  if exists (
    select 1
    from public.activities a
    join public.activity_types t on t.id = a.activity_type_id
    where a.user_id = new.user_id
      and a.id <> new.id
      and t.est_astreinte
      and a.debut < new.fin
      and a.fin > new.debut
  ) then
    -- Message et code stables, reconnus par l'interface. Aucune donnée de
    -- l'autre astreinte n'est révélée. 23P01 = violation d'exclusion.
    raise exception 'chevauchement_astreintes' using errcode = '23P01';
  end if;

  return new;
end;
$$;

revoke execute on function public.verifier_chevauchement_astreintes() from public, anon, authenticated;

-- Déclenché à la création, et à la modification des seules colonnes qui
-- peuvent créer un chevauchement (propriétaire, nature, début, fin).
create trigger activities_verifier_chevauchement_astreintes
  before insert or update of user_id, activity_type_id, debut, fin
  on public.activities
  for each row execute function public.verifier_chevauchement_astreintes();
