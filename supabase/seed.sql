-- =============================================================================
-- DONNÉES DE TEST LOCALES — ENTIÈREMENT FICTIVES
--
-- * TOUS LES TAUX SONT INVENTÉS (valeurs rondes). Ils ne correspondent à aucun
--   barème réel et ne doivent jamais être repris.
-- * Le compte de test est fictif (adresse en @example.com, domaine réservé).
-- * Ce fichier n'est joué que par « npx supabase db reset », sur la base
--   LOCALE. Il ne doit JAMAIS être appliqué en production.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Natures d'activité (liste initiale proposée, cahier des charges 3.3)
--    Seule « astreinte » déclenche la règle de déduction.
-- -----------------------------------------------------------------------------
insert into public.activity_types (code, libelle, est_astreinte, ordre) values
  ('AST', 'Astreinte',     true,  1),
  ('INT', 'Intervention',  false, 2),
  ('GAR', 'Garde',         false, 3),
  ('MAN', 'Manœuvre',      false, 4),
  ('FOR', 'Formation',     false, 5),
  ('ADM', 'Administratif', false, 6);


-- -----------------------------------------------------------------------------
-- 2. Grades
-- -----------------------------------------------------------------------------
insert into public.grades (libelle, ordre) values
  ('Sapeur',  1),
  ('Caporal', 2),
  ('Sergent', 3);


-- -----------------------------------------------------------------------------
-- 3. Grille de taux FICTIFS, en euros par heure
--    Grille complète (3 grades × 6 natures) au 01/01/2025, puis nouveaux taux
--    d'astreinte et d'intervention au 01/07/2026 pour tester l'historique.
-- -----------------------------------------------------------------------------
insert into public.reference_rates (grade_id, activity_type_id, taux_horaire, date_effet)
select g.id, t.id, v.taux_horaire, v.date_effet
from (values
  -- grade,    nature, taux fictif, date d'effet
  ('Sapeur',  'AST',  1.00, date '2025-01-01'),
  ('Sapeur',  'INT', 10.00, date '2025-01-01'),
  ('Sapeur',  'GAR',  8.00, date '2025-01-01'),
  ('Sapeur',  'MAN',  6.00, date '2025-01-01'),
  ('Sapeur',  'FOR',  5.00, date '2025-01-01'),
  ('Sapeur',  'ADM',  4.00, date '2025-01-01'),
  ('Caporal', 'AST',  2.00, date '2025-01-01'),
  ('Caporal', 'INT', 11.00, date '2025-01-01'),
  ('Caporal', 'GAR',  9.00, date '2025-01-01'),
  ('Caporal', 'MAN',  7.00, date '2025-01-01'),
  ('Caporal', 'FOR',  6.00, date '2025-01-01'),
  ('Caporal', 'ADM',  5.00, date '2025-01-01'),
  ('Sergent', 'AST',  3.00, date '2025-01-01'),
  ('Sergent', 'INT', 12.00, date '2025-01-01'),
  ('Sergent', 'GAR', 10.00, date '2025-01-01'),
  ('Sergent', 'MAN',  8.00, date '2025-01-01'),
  ('Sergent', 'FOR',  7.00, date '2025-01-01'),
  ('Sergent', 'ADM',  6.00, date '2025-01-01'),
  -- Changement de taux au 01/07/2026 (astreinte et intervention).
  ('Sapeur',  'AST',  2.00, date '2026-07-01'),
  ('Sapeur',  'INT', 11.00, date '2026-07-01'),
  ('Caporal', 'AST',  3.00, date '2026-07-01'),
  ('Caporal', 'INT', 12.00, date '2026-07-01'),
  ('Sergent', 'AST',  4.00, date '2026-07-01'),
  ('Sergent', 'INT', 13.00, date '2026-07-01')
) as v (grade, nature, taux_horaire, date_effet)
join public.grades g on g.libelle = v.grade
join public.activity_types t on t.code = v.nature;


-- -----------------------------------------------------------------------------
-- 4. Compte de test fictif
--    E-mail : demo@example.com — mot de passe : demo-spv-local
--    (identifiants publics, sans valeur : base locale uniquement).
--    Le profil (rôle « user ») est créé par le trigger on_auth_user_created.
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated',
  'demo@example.com',
  extensions.crypt('demo-spv-local', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(), now(),
  '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'email',
  '{"sub": "11111111-1111-4111-8111-111111111111", "email": "demo@example.com", "email_verified": true}',
  now(), now(), now()
);

update public.profiles
set nom_affichage = 'Compte de test'
where id = '11111111-1111-4111-8111-111111111111';

-- Historique de grade du compte de test : Sapeur, puis Caporal au 01/07/2026.
insert into public.user_grade_history (user_id, grade_id, date_effet)
select '11111111-1111-4111-8111-111111111111', g.id, v.date_effet
from (values
  ('Sapeur',  date '2025-01-01'),
  ('Caporal', date '2026-07-01')
) as v (grade, date_effet)
join public.grades g on g.libelle = v.grade;
