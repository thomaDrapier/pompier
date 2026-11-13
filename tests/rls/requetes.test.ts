// Tests d'intégration des requêtes de l'application (src/data/requetes.ts)
// contre Supabase LOCAL : ils vérifient que les filtres envoyés à l'API lisent
// bien les activités nécessaires au calcul d'une période, et que l'erreur du
// trigger de chevauchement est traduite en erreur métier.
//
// Le client utilisé est celui de l'application (src/lib/supabase.ts, clé
// publique), connecté avec un compte fictif créé pour l'occasion.
//
// Prérequis : Supabase local démarré (npx supabase start). Lancement :
// npm run test:rls

import { randomUUID } from 'node:crypto'
import type pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { calculerPeriode } from '@/data/calcul'
import { ErreurChevauchementAstreintes } from '@/data/erreurs'
import {
  creerActivite,
  lireActivitesPourPeriode,
  lireHistoriqueGrades,
  lireReferentiel,
  modifierActivite,
  supprimerActivite,
} from '@/data/requetes'
import { supabase } from '@/lib/supabase'
import { connexionBase, supprimerComptes } from '../helpers/comptes.ts'
import { configSupabaseLocal } from '../helpers/environnement.ts'

let base: pg.Client
let userId: string

// Référentiel FICTIF créé pour ces tests (taux inventés).
const suffixe = randomUUID().slice(0, 8)
let gradeTest: string
let natureAstreinte: string
let natureIntervention: string

// Décembre 2026, heure de Paris (UTC+1 en hiver).
const decembre = {
  debut: new Date('2026-12-01T00:00:00+01:00'),
  fin: new Date('2027-01-01T00:00:00+01:00'),
}

function paris(texte: string): Date {
  return new Date(`${texte}:00+01:00`)
}

beforeAll(async () => {
  // Garde-fou : refuse de s'exécuter hors de Supabase local.
  configSupabaseLocal()
  base = await connexionBase()

  const { data, error } = await supabase.auth.signUp({
    email: `requetes-${randomUUID()}@example.test`,
    password: `Test-${randomUUID()}`,
  })
  if (error || !data.user || !data.session) {
    throw new Error(`Création du compte de test impossible : ${error?.message ?? 'pas de session'}`)
  }
  userId = data.user.id

  const grade = await base.query<{ id: string }>(
    `insert into public.grades (libelle, ordre) values ($1, 9999) returning id`,
    [`TEST ${suffixe}`],
  )
  gradeTest = grade.rows[0].id
  const astreinte = await base.query<{ id: string }>(
    `insert into public.activity_types (code, libelle, est_astreinte, ordre)
     values ($1, 'TEST astreinte', true, 9999) returning id`,
    [`TEST-AST-${suffixe}`],
  )
  natureAstreinte = astreinte.rows[0].id
  const intervention = await base.query<{ id: string }>(
    `insert into public.activity_types (code, libelle, est_astreinte, ordre)
     values ($1, 'TEST intervention', false, 9999) returning id`,
    [`TEST-INT-${suffixe}`],
  )
  natureIntervention = intervention.rows[0].id
  await base.query(
    `insert into public.reference_rates (grade_id, activity_type_id, taux_horaire, date_effet)
     values ($1, $2, 2.00, '2025-01-01'), ($1, $3, 12.00, '2025-01-01')`,
    [gradeTest, natureAstreinte, natureIntervention],
  )
  await base.query(
    `insert into public.user_grade_history (user_id, grade_id, date_effet)
     values ($1, $2, '2025-01-01')`,
    [userId, gradeTest],
  )
})

afterAll(async () => {
  await supabase.auth.signOut()
  if (!base) return
  await supprimerComptes(base, [userId].filter(Boolean))
  const natures = [natureAstreinte, natureIntervention].filter(Boolean)
  await base.query(
    `delete from public.reference_rates
     where grade_id = $1 or activity_type_id = any($2::uuid[])`,
    [gradeTest, natures],
  )
  await base.query(`delete from public.activity_types where id = any($1::uuid[])`, [natures])
  await base.query(`delete from public.grades where id = $1`, [gradeTest])
  await base.end()
})

describe('requêtes de l’application contre Supabase local', () => {
  it('lit le référentiel et l’historique de grade de l’utilisateur', async () => {
    const referentiel = await lireReferentiel()
    const historique = await lireHistoriqueGrades(userId)

    expect(referentiel.natures.map((n) => n.id)).toEqual(
      expect.arrayContaining([natureAstreinte, natureIntervention]),
    )
    expect(referentiel.grades.map((g) => g.id)).toContain(gradeTest)
    expect(referentiel.taux.filter((t) => t.grade_id === gradeTest)).toHaveLength(2)
    expect(historique).toMatchObject([{ grade_id: gradeTest, date_effet: '2025-01-01' }])
  })

  it('lit, pour décembre, les activités hors période qui chevauchent ses astreintes, et calcule les bonnes déductions', async () => {
    // Astreinte du 01/12 00:00–08:00 et intervention commencée la veille.
    const debutMois = await creerActivite({
      natureId: natureAstreinte,
      debut: paris('2026-12-01T00:00'),
      fin: paris('2026-12-01T08:00'),
    })
    const laVeille = await creerActivite({
      natureId: natureIntervention,
      debut: paris('2026-11-30T23:30'),
      fin: paris('2026-12-01T00:30'),
    })
    // Astreinte à cheval sur la fin de période et intervention en janvier.
    const finMois = await creerActivite({
      natureId: natureAstreinte,
      debut: paris('2026-12-31T20:00'),
      fin: paris('2027-01-01T08:00'),
    })
    const enJanvier = await creerActivite({
      natureId: natureIntervention,
      debut: paris('2027-01-01T02:00'),
      fin: paris('2027-01-01T03:00'),
    })
    // Activités sans rapport avec la période : ne doivent pas être lues.
    const enNovembre = await creerActivite({
      natureId: natureIntervention,
      debut: paris('2026-11-15T10:00'),
      fin: paris('2026-11-15T11:00'),
    })
    const finJanvier = await creerActivite({
      natureId: natureIntervention,
      debut: paris('2027-01-20T10:00'),
      fin: paris('2027-01-20T11:00'),
    })

    const lues = await lireActivitesPourPeriode(userId, decembre, [natureAstreinte])
    const ids = lues.map((l) => l.id)

    expect(ids).toEqual(
      expect.arrayContaining([debutMois.id, laVeille.id, finMois.id, enJanvier.id]),
    )
    expect(ids).not.toContain(enNovembre.id)
    expect(ids).not.toContain(finJanvier.id)

    const referentiel = await lireReferentiel()
    const historique = await lireHistoriqueGrades(userId)
    const calcul = calculerPeriode(lues, referentiel.natures, historique, referentiel.taux, decembre)

    // Seules les deux astreintes commencent en décembre.
    expect(calcul.activites.map((l) => l.id)).toEqual([debutMois.id, finMois.id])
    expect(calcul.resultats).toMatchObject([
      { dureeDeclareeMin: 480, dureeDeduiteMin: 30, dureeNetteMin: 450, montantCentimes: 1500, statut: 'ok' },
      { dureeDeclareeMin: 720, dureeDeduiteMin: 60, dureeNetteMin: 660, montantCentimes: 2200, statut: 'ok' },
    ])
    expect(calcul.totaux.montantCentimes).toBe(3700)
  })

  it('traduit le refus du trigger en ErreurChevauchementAstreintes, à la création et à la modification', async () => {
    const premiere = await creerActivite({
      natureId: natureAstreinte,
      debut: paris('2026-10-26T08:00'),
      fin: paris('2026-10-26T12:00'),
    })
    const seconde = await creerActivite({
      natureId: natureAstreinte,
      debut: paris('2026-10-26T14:00'),
      fin: paris('2026-10-26T18:00'),
    })

    await expect(
      creerActivite({
        natureId: natureAstreinte,
        debut: paris('2026-10-26T10:00'),
        fin: paris('2026-10-26T13:00'),
      }),
    ).rejects.toBeInstanceOf(ErreurChevauchementAstreintes)
    await expect(
      modifierActivite(seconde.id, {
        natureId: natureAstreinte,
        debut: paris('2026-10-26T11:00'),
        fin: paris('2026-10-26T18:00'),
      }),
    ).rejects.toBeInstanceOf(ErreurChevauchementAstreintes)

    // Une modification valide passe, puis la suppression retire bien la ligne.
    const modifiee = await modifierActivite(seconde.id, {
      natureId: natureAstreinte,
      debut: paris('2026-10-26T12:00'),
      fin: paris('2026-10-26T18:00'),
      note: 'contiguë',
    })
    expect(modifiee.note).toBe('contiguë')

    await supprimerActivite(premiere.id)
    const restantes = await lireActivitesPourPeriode(
      userId,
      { debut: paris('2026-10-26T00:00'), fin: paris('2026-10-27T00:00') },
      [natureAstreinte],
    )
    expect(restantes.map((l) => l.id)).toEqual([seconde.id])
  })
})
