-- =============================================================================
-- Vérification manuelle de la migration 0001 (J0 · étape 0.3)
--
-- Script MANUEL, non exécuté automatiquement (les tests RLS automatisés
-- arrivent à l'étape 0.4 avec Vitest).
--
-- Exécution :
--   - Studio (http://127.0.0.1:54323) > SQL Editor : coller le script et lancer ;
--   - ou psql :
--       psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--            -v ON_ERROR_STOP=1 -f supabase/tests/verification_0_3.sql
--
-- Principe : tout se passe dans UNE transaction annulée à la fin (rollback) ;
-- la base n'est pas modifiée. Chaque test affiche « OK … » (notice) ; au
-- premier test en échec, le script s'arrête sur une erreur « ÉCHEC … ».
-- Le résultat final « Tous les tests 0.3 sont passés » n'apparaît que si
-- tous les tests ont réussi.
--
-- Données : comptes, grade, nature et taux FICTIFS, créés pour le test et
-- annulés par le rollback (aucune donnée personnelle, aucun taux réel).
-- Simulation d'un utilisateur : set local role authenticated + claims JWT
-- (request.jwt.claims), comme le fait l'API Supabase.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Préparation (en tant que postgres, administrateur de la base)
-- -----------------------------------------------------------------------------

-- Trois comptes fictifs : A, B et un administrateur.
-- Le trigger on_auth_user_created crée leurs profils (rôle 'user').
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'utilisateur.a@exemple.test'),
  ('00000000-0000-0000-0000-00000000000b', 'utilisateur.b@exemple.test'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@exemple.test');

do $$
declare n int;
begin
  select count(*) into n from public.profiles
  where id in ('00000000-0000-0000-0000-00000000000a',
               '00000000-0000-0000-0000-00000000000b',
               '00000000-0000-0000-0000-0000000000ad')
    and role = 'user' and actif;
  if n <> 3 then
    raise exception 'ÉCHEC : les 3 profils n''ont pas été créés par le trigger (% trouvés)', n;
  end if;
  raise notice 'OK : profils créés automatiquement à l''inscription (rôle user)';
end $$;

-- Promotion de l'administrateur « par SQL dans le Studio » (rôle postgres) :
-- doit être autorisée malgré le trigger de protection du rôle.
update public.profiles set role = 'admin'
where id = '00000000-0000-0000-0000-0000000000ad';

-- Référentiel fictif minimal (valeurs de test, pas des taux réels).
insert into public.grades (id, libelle, ordre)
values ('10000000-0000-0000-0000-000000000001', 'Grade de test', 1);
insert into public.activity_types (id, code, libelle, est_astreinte, ordre)
values ('20000000-0000-0000-0000-000000000001', 'TEST', 'Nature de test', false, 1);

-- Une activité pour B (créée en tant que postgres).
insert into public.activities (user_id, activity_type_id, debut, fin)
values ('00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001',
        '2026-01-10 08:00+01', '2026-01-10 10:00+01');

-- -----------------------------------------------------------------------------
-- Contraintes
-- -----------------------------------------------------------------------------

-- Activité avec fin <= début : refusée.
do $$
begin
  insert into public.activities (user_id, activity_type_id, debut, fin)
  values ('00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001',
          '2026-01-10 10:00+01', '2026-01-10 10:00+01');
  raise exception 'ÉCHEC : activité avec fin = début acceptée';
exception when check_violation then
  raise notice 'OK : activité avec fin <= début refusée';
end $$;

-- Doublon (grade, nature, date_effet) dans reference_rates : refusé.
insert into public.reference_rates (grade_id, activity_type_id, taux_horaire, date_effet)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        1.00, '2026-01-01');
do $$
begin
  insert into public.reference_rates (grade_id, activity_type_id, taux_horaire, date_effet)
  values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
          2.00, '2026-01-01');
  raise exception 'ÉCHEC : doublon (grade, nature, date_effet) accepté';
exception when unique_violation then
  raise notice 'OK : doublon (grade, nature, date_effet) refusé';
end $$;

-- -----------------------------------------------------------------------------
-- Utilisateur A (connecté, rôle user)
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- A crée sa propre activité (user_id rempli par défaut avec auth.uid()).
insert into public.activities (activity_type_id, debut, fin)
values ('20000000-0000-0000-0000-000000000001', '2026-01-11 08:00+01', '2026-01-11 09:00+01');

-- A ne voit que ses activités, pas celles de B.
do $$
declare n_b int; n_a int;
begin
  select count(*) into n_b from public.activities
  where user_id = '00000000-0000-0000-0000-00000000000b';
  select count(*) into n_a from public.activities;
  if n_b <> 0 then raise exception 'ÉCHEC : A voit % activité(s) de B', n_b; end if;
  if n_a <> 1 then raise exception 'ÉCHEC : A devrait voir exactement 1 activité, en voit %', n_a; end if;
  raise notice 'OK : A voit sa seule activité, aucune de B';
end $$;

-- A ne peut pas insérer une activité pour B.
do $$
begin
  insert into public.activities (user_id, activity_type_id, debut, fin)
  values ('00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001',
          '2026-01-12 08:00+01', '2026-01-12 09:00+01');
  raise exception 'ÉCHEC : A a pu insérer une activité pour B';
exception when insufficient_privilege then
  raise notice 'OK : A ne peut pas insérer une activité pour B';
end $$;

-- A ne peut ni modifier ni supprimer l'activité de B (0 ligne touchée).
do $$
declare n int;
begin
  update public.activities set note = 'piratage'
  where user_id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a modifié % activité(s) de B', n; end if;
  delete from public.activities where user_id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a supprimé % activité(s) de B', n; end if;
  raise notice 'OK : A ne peut ni modifier ni supprimer les activités de B';
end $$;

-- A peut renseigner son propre grade, pas celui de B.
insert into public.user_grade_history (grade_id, user_id, date_effet)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '2025-01-01');
do $$
begin
  insert into public.user_grade_history (grade_id, user_id, date_effet)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '2025-01-01');
  raise exception 'ÉCHEC : A a pu renseigner le grade de B';
exception when insufficient_privilege then
  raise notice 'OK : A renseigne son grade mais pas celui de B';
end $$;

-- A peut lire le référentiel...
do $$
declare n int;
begin
  select count(*) into n from public.reference_rates;
  if n <> 1 then raise exception 'ÉCHEC : A devrait lire 1 taux, en lit %', n; end if;
  raise notice 'OK : A lit le référentiel';
end $$;

-- ... mais ne peut pas y écrire (grades, activity_types, reference_rates).
do $$
begin
  insert into public.grades (libelle, ordre) values ('Grade pirate', 99);
  raise exception 'ÉCHEC : A a pu écrire dans grades';
exception when insufficient_privilege then
  raise notice 'OK : A ne peut pas écrire dans grades';
end $$;

do $$
begin
  insert into public.activity_types (code, libelle, ordre) values ('PIRATE', 'Nature pirate', 99);
  raise exception 'ÉCHEC : A a pu écrire dans activity_types';
exception when insufficient_privilege then
  raise notice 'OK : A ne peut pas écrire dans activity_types';
end $$;

do $$
declare n int;
begin
  begin
    insert into public.reference_rates (grade_id, activity_type_id, taux_horaire, date_effet)
    values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
            9.99, '2026-06-01');
    raise exception 'ÉCHEC : A a pu insérer un taux';
  exception when insufficient_privilege then null;
  end;
  update public.reference_rates set taux_horaire = 9.99;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a modifié % taux', n; end if;
  delete from public.reference_rates;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a supprimé % taux', n; end if;
  raise notice 'OK : A ne peut ni ajouter, ni modifier, ni supprimer un taux';
end $$;

-- A peut modifier son nom d'affichage...
do $$
declare n int;
begin
  update public.profiles set nom_affichage = 'Utilisateur A'
  where id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'ÉCHEC : A n''a pas pu modifier son nom d''affichage'; end if;
  raise notice 'OK : A modifie son nom d''affichage';
end $$;

-- ... mais pas passer son propre rôle à 'admin', ni changer son statut actif.
do $$
begin
  update public.profiles set role = 'admin'
  where id = '00000000-0000-0000-0000-00000000000a';
  raise exception 'ÉCHEC : A a pu se promouvoir administrateur';
exception when insufficient_privilege then
  raise notice 'OK : A ne peut pas passer son rôle à admin';
end $$;

do $$
begin
  update public.profiles set actif = false
  where id = '00000000-0000-0000-0000-00000000000a';
  raise exception 'ÉCHEC : A a pu modifier son statut actif';
exception when insufficient_privilege then
  raise notice 'OK : A ne peut pas modifier son statut actif';
end $$;

-- A ne voit pas les autres profils.
do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'ÉCHEC : A voit % profils au lieu du sien seul', n; end if;
  raise notice 'OK : A ne voit que son profil';
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- Administrateur (connecté, rôle admin)
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);

-- L'administrateur écrit dans le référentiel.
do $$
declare n int;
begin
  insert into public.grades (id, libelle, ordre)
  values ('10000000-0000-0000-0000-000000000002', 'Autre grade de test', 2);
  insert into public.activity_types (id, code, libelle, est_astreinte, ordre)
  values ('20000000-0000-0000-0000-000000000002', 'TEST2', 'Autre nature de test', true, 2);
  insert into public.reference_rates (grade_id, activity_type_id, taux_horaire, date_effet)
  values ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
          1.00, '2026-01-01');
  update public.activity_types set libelle = 'Nature de test modifiée'
  where id = '20000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'ÉCHEC : l''admin n''a pas pu modifier une nature'; end if;
  raise notice 'OK : l''administrateur écrit dans le référentiel';
end $$;

-- L'administrateur voit tous les profils et peut gérer les rôles / statuts.
do $$
declare n int;
begin
  select count(*) into n from public.profiles
  where id in ('00000000-0000-0000-0000-00000000000a',
               '00000000-0000-0000-0000-00000000000b',
               '00000000-0000-0000-0000-0000000000ad');
  if n <> 3 then raise exception 'ÉCHEC : l''admin voit % profils de test sur 3', n; end if;
  update public.profiles set actif = false
  where id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'ÉCHEC : l''admin n''a pas pu désactiver B'; end if;
  raise notice 'OK : l''administrateur voit les profils et gère le statut actif';
end $$;

-- L'administrateur n'a AUCUN accès aux activités des autres.
do $$
declare n int;
begin
  select count(*) into n from public.activities;
  if n <> 0 then raise exception 'ÉCHEC : l''admin voit % activité(s) d''autres utilisateurs', n; end if;
  raise notice 'OK : l''administrateur ne voit pas les activités des autres';
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- Visiteur anonyme (non connecté)
-- -----------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

-- Aucun droit sur les tables : la lecture est refusée (ou ne renvoie rien).
do $$
declare
  t text;
  n int;
begin
  foreach t in array array['profiles', 'grades', 'activity_types',
                           'reference_rates', 'user_grade_history', 'activities']
  loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      if n <> 0 then
        raise exception 'ÉCHEC : un anonyme voit % ligne(s) de %', n, t;
      end if;
    exception when insufficient_privilege then null;
    end;
  end loop;
  raise notice 'OK : un visiteur anonyme ne voit aucune ligne';
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- Fin : tout est annulé. Ce message n'est atteint que si aucun test n'a échoué.
-- -----------------------------------------------------------------------------
rollback;

select 'Tous les tests 0.3 sont passés' as resultat;
