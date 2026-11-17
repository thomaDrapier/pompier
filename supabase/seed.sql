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
--    Seule « astreinte » déclenche la règle de déduction. Une nature par type
--    d'intervention (D-032), cochée « est une intervention ». La dernière
--    nature n'a volontairement AUCUN taux : ses activités sont en
--    « taux manquant » (jeu de démonstration).
-- -----------------------------------------------------------------------------
insert into public.activity_types (code, libelle, est_astreinte, est_intervention, ordre) values
  ('AST',  'Astreinte',                 true,  false, 1),
  ('VSAV', 'Intervention VSAV',         false, true,  2),
  ('FPT',  'Intervention FPT',          false, true,  3),
  ('VRID', 'Intervention VRID',         false, true,  4),
  ('GAR',  'Garde',                     false, false, 5),
  ('MAN',  'Manœuvre',                  false, false, 6),
  ('FOR',  'Formation',                 false, false, 7),
  ('ADM',  'Administratif',             false, false, 8),
  ('DEMO', 'Réunion (démo, sans taux)', false, false, 9);


-- -----------------------------------------------------------------------------
-- 2. Grades
-- -----------------------------------------------------------------------------
insert into public.grades (libelle, ordre) values
  ('Sapeur',  1),
  ('Caporal', 2),
  ('Sergent', 3);


-- -----------------------------------------------------------------------------
-- 3. Grille de taux FICTIFS, en euros par heure
--    Grille complète au 01/01/2025, puis nouveaux taux d'astreinte et
--    d'intervention au 01/07/2026 pour tester l'historique. Les trois natures
--    d'intervention ont des taux identiques (copiés de VSAV ci-dessous).
--    La nature « DEMO » n'a aucun taux.
-- -----------------------------------------------------------------------------
insert into public.reference_rates (grade_id, activity_type_id, taux_horaire, date_effet)
select g.id, t.id, v.taux_horaire, v.date_effet
from (values
  -- grade,    nature, taux fictif, date d'effet
  ('Sapeur',  'AST',  1.00, date '2025-01-01'),
  ('Sapeur',  'VSAV', 10.00, date '2025-01-01'),
  ('Sapeur',  'GAR',  8.00, date '2025-01-01'),
  ('Sapeur',  'MAN',  6.00, date '2025-01-01'),
  ('Sapeur',  'FOR',  5.00, date '2025-01-01'),
  ('Sapeur',  'ADM',  4.00, date '2025-01-01'),
  ('Caporal', 'AST',  2.00, date '2025-01-01'),
  ('Caporal', 'VSAV', 11.00, date '2025-01-01'),
  ('Caporal', 'GAR',  9.00, date '2025-01-01'),
  ('Caporal', 'MAN',  7.00, date '2025-01-01'),
  ('Caporal', 'FOR',  6.00, date '2025-01-01'),
  ('Caporal', 'ADM',  5.00, date '2025-01-01'),
  ('Sergent', 'AST',  3.00, date '2025-01-01'),
  ('Sergent', 'VSAV', 12.00, date '2025-01-01'),
  ('Sergent', 'GAR', 10.00, date '2025-01-01'),
  ('Sergent', 'MAN',  8.00, date '2025-01-01'),
  ('Sergent', 'FOR',  7.00, date '2025-01-01'),
  ('Sergent', 'ADM',  6.00, date '2025-01-01'),
  -- Changement de taux au 01/07/2026 (astreinte et intervention).
  ('Sapeur',  'AST',  2.00, date '2026-07-01'),
  ('Sapeur',  'VSAV', 11.00, date '2026-07-01'),
  ('Caporal', 'AST',  3.00, date '2026-07-01'),
  ('Caporal', 'VSAV', 12.00, date '2026-07-01'),
  ('Sergent', 'AST',  4.00, date '2026-07-01'),
  ('Sergent', 'VSAV', 13.00, date '2026-07-01')
) as v (grade, nature, taux_horaire, date_effet)
join public.grades g on g.libelle = v.grade
join public.activity_types t on t.code = v.nature;

-- Interventions FPT et VRID : mêmes taux que VSAV (D-032).
insert into public.reference_rates (grade_id, activity_type_id, taux_horaire, date_effet)
select r.grade_id, autre.id, r.taux_horaire, r.date_effet
from public.reference_rates r
join public.activity_types vsav on vsav.id = r.activity_type_id and vsav.code = 'VSAV'
cross join public.activity_types autre
where autre.code in ('FPT', 'VRID');


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

-- L'historique de grade et les activités du compte de test sont créés par le
-- jeu de démonstration (section 6), à des dates relatives au reset.


-- -----------------------------------------------------------------------------
-- 5. Compte administrateur fictif (écrans d'administration, J2)
--    E-mail : admin@example.com — mot de passe : admin-spv-local
--    (identifiants publics, sans valeur : base locale uniquement).
--    Le profil est créé par le trigger on_auth_user_created avec le rôle
--    « user », puis promu ici. Le seed est joué par le rôle postgres : le
--    trigger de protection du rôle l'autorise (D-008), comme pour la promotion
--    du premier administrateur dans le Studio.
--    Pas d'historique de grade : ce compte sert à administrer le référentiel.
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated',
  'admin@example.com',
  extensions.crypt('admin-spv-local', extensions.gen_salt('bf')),
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
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  'email',
  '{"sub": "22222222-2222-4222-8222-222222222222", "email": "admin@example.com", "email_verified": true}',
  now(), now(), now()
);

update public.profiles
set nom_affichage = 'Administrateur de test', role = 'admin', actif = true
where id = '22222222-2222-4222-8222-222222222222';


-- -----------------------------------------------------------------------------
-- 6. Jeu de démonstration pour demo@example.com (J3, données FICTIVES)
--
--    Toutes les dates sont calculées à partir du jour du « db reset », en
--    heure de Paris : le seed se rejoue sans erreur à toute date. Période
--    couverte : les 3 mois précédents et le mois en cours, jusqu'à
--    maintenant (aucune activité future).
--
--    - Grade : aucun grade pendant les 7 premiers jours de la période (toutes
--      les activités de ces jours sont en « taux manquant », astreintes et
--      interventions comprises : D-034, D-035), puis Sapeur, puis promotion
--      Caporal au 15 du mois précédent (D-028 : dates distinctes).
--    - Chaque semaine : astreintes de nuit (mardi, jeudi 18 h → 8 h), de
--      week-end (samedi 8 h → dimanche 8 h, donc la nuit d'un changement
--      d'heure s'il y en a un dans la période) et du dimanche 18 h au lundi
--      8 h (à cheval sur deux semaines) ; interventions VSAV (les plus
--      nombreuses), FPT et VRID, pendant et hors astreinte ; garde ou
--      formation, manœuvre, administratif ; une réunion sans taux toutes les
--      trois semaines.
--    - Une astreinte à cheval sur deux mois : la nuit du dernier jour du
--      mois M-2 au 1er du mois M-1.
--    - Jamais deux astreintes qui se chevauchent : chaque astreinte n'est
--      créée que si elle ne chevauche aucune astreinte déjà créée (le trigger
--      de D-010 refuserait sinon le seed).
-- -----------------------------------------------------------------------------
do $$
declare
  demo constant uuid := '11111111-1111-4111-8111-111111111111';
  -- Jour du reset à Paris et début de la période (1er du mois M-3).
  aujourdhui constant date := (now() at time zone 'Europe/Paris')::date;
  mois_courant constant date := date_trunc('month', aujourdhui)::date;
  debut_periode constant date := (mois_courant - interval '3 months')::date;
  debut_periode_ts constant timestamptz := debut_periode::timestamp at time zone 'Europe/Paris';
  lundi date;
  n int := 0;
  -- Nuit à cheval sur deux mois : dernier jour du mois M-2.
  veille_m1 constant date := (mois_courant - interval '1 month')::date - 1;
begin
  -- Historique de grade (dates relatives).
  insert into public.user_grade_history (user_id, grade_id, date_effet)
  select demo, g.id, v.date_effet
  from (values
    ('Sapeur',  debut_periode + 7),
    ('Caporal', (mois_courant - interval '1 month')::date + 14)
  ) as v (grade, date_effet)
  join public.grades g on g.libelle = v.grade;

  -- Astreinte à cheval sur deux mois, avec une intervention VSAV pendant.
  insert into public.activities (user_id, activity_type_id, debut, fin, note)
  select demo, t.id,
         (v.jour + v.debut) at time zone 'Europe/Paris',
         (v.jour + v.fin_jour + v.fin) at time zone 'Europe/Paris',
         'Démo : à cheval sur deux mois'
  from (values
    ('AST',  veille_m1, time '18:00', 1, time '08:00'),
    ('VSAV', veille_m1, time '22:00', 0, time '23:30')
  ) as v (code, jour, debut, fin_jour, fin)
  join public.activity_types t on t.code = v.code;

  -- Motif hebdomadaire, du lundi de la première semaine à celui de la semaine en cours.
  for lundi in
    select generate_series(date_trunc('week', debut_periode), aujourdhui, interval '1 week')::date
  loop
    n := n + 1;
    insert into public.activities (user_id, activity_type_id, debut, fin)
    select demo, t.id, v.debut_ts, v.fin_ts
    from (
      select code,
             (lundi + jour_debut + heure_debut) at time zone 'Europe/Paris' as debut_ts,
             (lundi + jour_fin + heure_fin) at time zone 'Europe/Paris' as fin_ts
      from (values
        -- code, jour et heure de début, jour et heure de fin (0 = lundi)
        ('AST',  1, time '18:00', 2, time '08:00'),  -- mardi soir → mercredi matin
        ('VSAV', 1, time '23:00', 2, time '00:30'),  -- pendant l'astreinte
        ('VSAV', 2, time '12:00', 2, time '13:00'),  -- hors astreinte
        ('AST',  3, time '18:00', 4, time '08:00'),  -- jeudi soir → vendredi matin
        (case n % 4 when 1 then 'FPT' when 3 then 'VRID' else 'VSAV' end,
                 4, time '02:00', 4, time '03:15'),  -- pendant l'astreinte
        ('AST',  5, time '08:00', 6, time '08:00'),  -- week-end
        ('VSAV', 5, time '14:00', 5, time '15:30'),  -- pendant l'astreinte
        ('AST',  6, time '18:00', 7, time '08:00'),  -- dimanche soir → lundi : à cheval sur deux semaines
        (case when n % 2 = 0 then 'GAR' else 'FOR' end,
                 0, time '09:00', 0, time '17:00'),
        ('MAN',  3, time '19:00', 3, time '21:00'),  -- pendant l'astreinte du jeudi
        ('ADM',  4, time '10:00', 4, time '12:00'),
        (case when n % 3 = 0 then 'DEMO' end,
                 2, time '18:00', 2, time '19:00')   -- réunion sans taux
      ) as motif (code, jour_debut, heure_debut, jour_fin, heure_fin)
      where code is not null
    ) as v
    join public.activity_types t on t.code = v.code
    where v.debut_ts >= debut_periode_ts
      and v.fin_ts <= now()
      -- Une astreinte n'est créée que si elle ne chevauche aucune astreinte existante.
      and (
        not t.est_astreinte
        or not exists (
          select 1
          from public.activities a
          join public.activity_types ta on ta.id = a.activity_type_id
          where a.user_id = demo
            and ta.est_astreinte
            and a.debut < v.fin_ts
            and a.fin > v.debut_ts
        )
      );
  end loop;
end;
$$;
