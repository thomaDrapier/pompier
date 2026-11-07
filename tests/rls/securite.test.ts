// Tests automatisés des règles de sécurité de la base (Row Level Security).
// Cahier des charges, section 9 : « Deux utilisateurs ne peuvent jamais lire
// les données l'un de l'autre » et « Un utilisateur non administrateur ne peut
// modifier ni grade du référentiel, ni nature, ni taux ».
//
// Toutes les vérifications passent par l'API Supabase avec la clé PUBLIQUE et
// un compte connecté (ou aucun), exactement comme l'application. Le rôle
// postgres ne sert qu'à préparer et nettoyer les données (D-008).
//
// Prérequis : Supabase local démarré (npx supabase start). Lancement :
// npm run test:rls

import { randomUUID } from 'node:crypto'
import type pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  connexionBase,
  creerCompte,
  nouveauClient,
  supprimerComptes,
  type CompteTest,
} from '../helpers/comptes.ts'

// Codes d'erreur PostgreSQL renvoyés par l'API.
const REFUS_DROITS = '42501' // RLS ou droits insuffisants
const VIOLATION_CHECK = '23514' // contrainte check (fin > debut)
const VIOLATION_UNICITE = '23505' // contrainte unique

let base: pg.Client
let a: CompteTest
let b: CompteTest
let admin: CompteTest

// Référentiel FICTIF (libellés « TEST », taux à 0 : aucun taux réel).
const suffixe = randomUUID().slice(0, 8)
let gradeTest: string
let natureTest: string
let tauxTest: string
// Lignes du référentiel créées par l'administrateur au cas f (à nettoyer).
const gradesCrees: string[] = []
const naturesCreees: string[] = []

// Une activité de A (cas a) et une de B.
let activiteA: string
let activiteB: string

beforeAll(async () => {
  base = await connexionBase()

  // Trois comptes fictifs, créés comme par un utilisateur (signUp).
  a = await creerCompte('rls-a')
  b = await creerCompte('rls-b')
  admin = await creerCompte('rls-admin')

  // Promotion de l'administrateur par SQL (rôle postgres), comme dans le
  // Studio : autorisée par D-008 malgré le trigger de protection du rôle.
  await base.query(`update public.profiles set role = 'admin' where id = $1`, [admin.id])

  const grade = await base.query<{ id: string }>(
    `insert into public.grades (libelle, ordre) values ($1, 9999) returning id`,
    [`TEST ${suffixe}`],
  )
  gradeTest = grade.rows[0].id
  const nature = await base.query<{ id: string }>(
    `insert into public.activity_types (code, libelle, est_astreinte, ordre)
     values ($1, 'TEST', false, 9999) returning id`,
    [`TEST-${suffixe}`],
  )
  natureTest = nature.rows[0].id
  const taux = await base.query<{ id: string }>(
    `insert into public.reference_rates (grade_id, activity_type_id, taux_horaire, date_effet)
     values ($1, $2, 0, '2000-01-01') returning id`,
    [gradeTest, natureTest],
  )
  tauxTest = taux.rows[0].id

  // B crée sa propre activité par l'API.
  const { data, error } = await b.client
    .from('activities')
    .insert({ activity_type_id: natureTest, debut: '2026-01-10T08:00:00+01:00', fin: '2026-01-10T10:00:00+01:00' })
    .select('id')
    .single()
  if (error) throw new Error(`Préparation : activité de B impossible (${error.message})`)
  activiteB = data.id
})

afterAll(async () => {
  if (!base) return
  // 1. Les comptes (cascade : profils, activités, historiques de grade).
  await supprimerComptes(base, [a?.id, b?.id, admin?.id].filter((id): id is string => !!id))
  // 2. Le référentiel fictif : taux d'abord (clés étrangères en restrict).
  const grades = [gradeTest, ...gradesCrees].filter(Boolean)
  const natures = [natureTest, ...naturesCreees].filter(Boolean)
  await base.query(
    `delete from public.reference_rates
     where grade_id = any($1::uuid[]) or activity_type_id = any($2::uuid[])`,
    [grades, natures],
  )
  await base.query(`delete from public.activity_types where id = any($1::uuid[])`, [natures])
  await base.query(`delete from public.grades where id = any($1::uuid[])`, [grades])
  await base.end()
})

// Lit une colonne directement en base (rôle postgres), pour vérifier qu'une
// tentative refusée n'a rien modifié.
async function lireEnBase(table: string, colonne: string, id: string): Promise<unknown> {
  const r = await base.query(`select ${colonne} as valeur from public.${table} where id = $1`, [id])
  return r.rows[0]?.valeur
}

describe('Comptes', () => {
  it('le profil est créé automatiquement à l’inscription, avec le rôle user', async () => {
    const r = await base.query<{ id: string; role: string; actif: boolean }>(
      `select id, role, actif from public.profiles where id = any($1::uuid[])`,
      [[a.id, b.id]],
    )
    expect(r.rows).toHaveLength(2)
    for (const profil of r.rows) {
      expect(profil.role).toBe('user')
      expect(profil.actif).toBe(true)
    }
  })

  it('la promotion de l’administrateur par SQL (rôle postgres) est autorisée (D-008)', async () => {
    expect(await lireEnBase('profiles', 'role', admin.id)).toBe('admin')
  })
})

describe('a. Isolation des activités entre utilisateurs', () => {
  it('A crée une activité (user_id rempli automatiquement)', async () => {
    const { data, error } = await a.client
      .from('activities')
      .insert({ activity_type_id: natureTest, debut: '2026-01-11T08:00:00+01:00', fin: '2026-01-11T09:00:00+01:00' })
      .select('id, user_id')
      .single()
    expect(error).toBeNull()
    expect(data?.user_id).toBe(a.id)
    activiteA = data!.id
  })

  it('A ne voit que sa propre activité', async () => {
    const { data, error } = await a.client.from('activities').select('id, user_id')
    expect(error).toBeNull()
    expect(data).toEqual([{ id: activiteA, user_id: a.id }])
  })

  it('B ne voit pas l’activité de A', async () => {
    const { data, error } = await b.client.from('activities').select('id, user_id')
    expect(error).toBeNull()
    expect(data?.map((l) => l.id)).toEqual([activiteB])
  })

  it('B ne peut pas modifier l’activité de A', async () => {
    const { data, error } = await b.client
      .from('activities')
      .update({ note: 'modifiée par B' })
      .eq('id', activiteA)
      .select('id')
    expect(error).toBeNull()
    expect(data).toEqual([]) // aucune ligne visible, donc aucune modifiée
    expect(await lireEnBase('activities', 'note', activiteA)).toBeNull()
  })

  it('B ne peut pas supprimer l’activité de A', async () => {
    const { data, error } = await b.client.from('activities').delete().eq('id', activiteA).select('id')
    expect(error).toBeNull()
    expect(data).toEqual([])
    expect(await lireEnBase('activities', 'id', activiteA)).toBe(activiteA)
  })
})

describe('b. Écriture au nom d’un autre utilisateur', () => {
  it('A ne peut pas insérer une activité avec user_id = B', async () => {
    const { error } = await a.client.from('activities').insert({
      user_id: b.id,
      activity_type_id: natureTest,
      debut: '2026-01-12T08:00:00+01:00',
      fin: '2026-01-12T09:00:00+01:00',
    })
    expect(error?.code).toBe(REFUS_DROITS)
  })

  it('A ne peut pas insérer un historique de grade avec user_id = B', async () => {
    const { error } = await a.client
      .from('user_grade_history')
      .insert({ user_id: b.id, grade_id: gradeTest, date_effet: '2026-01-01' })
    expect(error?.code).toBe(REFUS_DROITS)
  })

  it('A peut renseigner son propre historique de grade', async () => {
    const { error } = await a.client
      .from('user_grade_history')
      .insert({ user_id: a.id, grade_id: gradeTest, date_effet: '2026-01-01' })
    expect(error).toBeNull()
  })
})

describe('c. Référentiel en lecture seule pour un utilisateur', () => {
  it('A lit les grades, les natures et les taux', async () => {
    const grades = await a.client.from('grades').select('id').eq('id', gradeTest)
    const natures = await a.client.from('activity_types').select('id').eq('id', natureTest)
    const taux = await a.client.from('reference_rates').select('id').eq('id', tauxTest)
    expect(grades.data).toHaveLength(1)
    expect(natures.data).toHaveLength(1)
    expect(taux.data).toHaveLength(1)
  })

  it('A ne peut pas ajouter de grade, de nature ni de taux', async () => {
    const grade = await a.client.from('grades').insert({ libelle: `TEST A ${suffixe}`, ordre: 1 })
    const nature = await a.client
      .from('activity_types')
      .insert({ code: `TEST-A-${suffixe}`, libelle: 'TEST', ordre: 1 })
    const taux = await a.client.from('reference_rates').insert({
      grade_id: gradeTest,
      activity_type_id: natureTest,
      taux_horaire: 0,
      date_effet: '2001-01-01',
    })
    expect(grade.error?.code).toBe(REFUS_DROITS)
    expect(nature.error?.code).toBe(REFUS_DROITS)
    expect(taux.error?.code).toBe(REFUS_DROITS)
  })

  it('A ne peut pas modifier un grade, une nature ni un taux', async () => {
    const grade = await a.client.from('grades').update({ ordre: 1 }).eq('id', gradeTest).select('id')
    const nature = await a.client
      .from('activity_types')
      .update({ est_astreinte: true })
      .eq('id', natureTest)
      .select('id')
    const taux = await a.client
      .from('reference_rates')
      .update({ taux_horaire: 1 })
      .eq('id', tauxTest)
      .select('id')
    expect(grade.data).toEqual([])
    expect(nature.data).toEqual([])
    expect(taux.data).toEqual([])
    expect(await lireEnBase('grades', 'ordre', gradeTest)).toBe(9999)
    expect(await lireEnBase('activity_types', 'est_astreinte', natureTest)).toBe(false)
    expect(await lireEnBase('reference_rates', 'taux_horaire', tauxTest)).toBe('0.00')
  })

  it('A ne peut pas supprimer un grade, une nature ni un taux', async () => {
    const taux = await a.client.from('reference_rates').delete().eq('id', tauxTest).select('id')
    const nature = await a.client.from('activity_types').delete().eq('id', natureTest).select('id')
    const grade = await a.client.from('grades').delete().eq('id', gradeTest).select('id')
    expect(taux.data).toEqual([])
    expect(nature.data).toEqual([])
    expect(grade.data).toEqual([])
    expect(await lireEnBase('reference_rates', 'id', tauxTest)).toBe(tauxTest)
    expect(await lireEnBase('activity_types', 'id', natureTest)).toBe(natureTest)
    expect(await lireEnBase('grades', 'id', gradeTest)).toBe(gradeTest)
  })
})

describe('d. Rôle et statut actif protégés (D-008)', () => {
  it('A ne peut pas passer son rôle à admin', async () => {
    const { error } = await a.client.from('profiles').update({ role: 'admin' }).eq('id', a.id)
    expect(error?.code).toBe(REFUS_DROITS)
    expect(await lireEnBase('profiles', 'role', a.id)).toBe('user')
  })

  it('A ne peut pas modifier son statut actif', async () => {
    const { error } = await a.client.from('profiles').update({ actif: false }).eq('id', a.id)
    expect(error?.code).toBe(REFUS_DROITS)
    expect(await lireEnBase('profiles', 'actif', a.id)).toBe(true)
  })

  it('A peut modifier son nom d’affichage', async () => {
    const { data, error } = await a.client
      .from('profiles')
      .update({ nom_affichage: 'Utilisateur A (test)' })
      .eq('id', a.id)
      .select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

describe('e. Visibilité des profils', () => {
  it('A ne voit que son propre profil', async () => {
    const { data, error } = await a.client.from('profiles').select('id')
    expect(error).toBeNull()
    expect(data).toEqual([{ id: a.id }])
  })

  it('l’administrateur voit tous les profils', async () => {
    const { data, error } = await admin.client.from('profiles').select('id')
    expect(error).toBeNull()
    const ids = data?.map((p) => p.id)
    expect(ids).toEqual(expect.arrayContaining([a.id, b.id, admin.id]))
  })

  it('l’administrateur peut désactiver puis réactiver un compte', async () => {
    const desactivation = await admin.client
      .from('profiles')
      .update({ actif: false })
      .eq('id', b.id)
      .select('id')
    expect(desactivation.error).toBeNull()
    expect(desactivation.data).toHaveLength(1)
    expect(await lireEnBase('profiles', 'actif', b.id)).toBe(false)

    const reactivation = await admin.client.from('profiles').update({ actif: true }).eq('id', b.id)
    expect(reactivation.error).toBeNull()
    expect(await lireEnBase('profiles', 'actif', b.id)).toBe(true)
  })
})

describe('f. Droits de l’administrateur', () => {
  it('l’administrateur ajoute, modifie et supprime dans le référentiel', async () => {
    const grade = await admin.client
      .from('grades')
      .insert({ libelle: `TEST admin ${suffixe}`, ordre: 9998 })
      .select('id')
      .single()
    expect(grade.error).toBeNull()
    gradesCrees.push(grade.data!.id)

    const nature = await admin.client
      .from('activity_types')
      .insert({ code: `TEST-ADMIN-${suffixe}`, libelle: 'TEST', est_astreinte: true, ordre: 9998 })
      .select('id')
      .single()
    expect(nature.error).toBeNull()
    naturesCreees.push(nature.data!.id)

    const taux = await admin.client
      .from('reference_rates')
      .insert({
        grade_id: grade.data!.id,
        activity_type_id: nature.data!.id,
        taux_horaire: 0,
        date_effet: '2000-01-01',
      })
      .select('id')
      .single()
    expect(taux.error).toBeNull()

    const modification = await admin.client
      .from('activity_types')
      .update({ libelle: 'TEST modifié' })
      .eq('id', nature.data!.id)
      .select('id')
    expect(modification.data).toHaveLength(1)

    const suppression = await admin.client
      .from('reference_rates')
      .delete()
      .eq('id', taux.data!.id)
      .select('id')
    expect(suppression.data).toHaveLength(1)
  })

  it('l’administrateur ne voit pas les activités de A', async () => {
    const { data, error } = await admin.client.from('activities').select('id, user_id')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('l’administrateur ne voit pas l’historique de grade de A', async () => {
    const { data, error } = await admin.client.from('user_grade_history').select('id')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe('g. Visiteur non connecté (D-009)', () => {
  const tables = [
    'profiles',
    'grades',
    'activity_types',
    'reference_rates',
    'user_grade_history',
    'activities',
  ] as const

  it.each(tables)('accès refusé à la table %s', async (table) => {
    const anonyme = nouveauClient()
    const { data, error } = await anonyme.from(table).select('id')
    expect(error?.code).toBe(REFUS_DROITS)
    expect(data).toBeNull()
  })
})

describe('h. Contraintes de la base', () => {
  it('une activité dont la fin est égale au début est refusée', async () => {
    const { error } = await a.client.from('activities').insert({
      activity_type_id: natureTest,
      debut: '2026-01-13T10:00:00+01:00',
      fin: '2026-01-13T10:00:00+01:00',
    })
    expect(error?.code).toBe(VIOLATION_CHECK)
  })

  it('une activité dont la fin précède le début est refusée', async () => {
    const { error } = await a.client.from('activities').insert({
      activity_type_id: natureTest,
      debut: '2026-01-13T10:00:00+01:00',
      fin: '2026-01-13T09:00:00+01:00',
    })
    expect(error?.code).toBe(VIOLATION_CHECK)
  })

  it('un doublon (grade, nature, date d’effet) est refusé', async () => {
    const { error } = await admin.client.from('reference_rates').insert({
      grade_id: gradeTest,
      activity_type_id: natureTest,
      taux_horaire: 0,
      date_effet: '2000-01-01',
    })
    expect(error?.code).toBe(VIOLATION_UNICITE)
  })
})
