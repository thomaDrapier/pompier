// Tests des règles du référentiel en base (J2, étape 2.1) : unicités
// (D-023, D-024, D-026, D-028), taux positif ou nul (D-027), suppression d'un
// élément déjà utilisé (D-018), verrou de « est une astreinte » et fonction
// nature_utilisee() (D-022), droits de l'administrateur et isolation de
// l'historique de grades et des profils.
//
// Toutes les vérifications passent par l'API Supabase avec la clé PUBLIQUE et
// un compte connecté (ou aucun), exactement comme l'application. Le rôle
// postgres ne sert qu'à préparer, observer et nettoyer les données (D-008).
// Chaque erreur reçue est aussi passée à la traduction de l'application
// (src/data/erreurs.ts) : on vérifie ainsi les vrais messages de PostgreSQL.
//
// Prérequis : Supabase local démarré (npx supabase start). Lancement :
// npm run test:rls

import { randomUUID } from 'node:crypto'
import type pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  ErreurAstreinteVerrouillee,
  ErreurDejaServi,
  ErreurDoublon,
  ErreurTauxNegatif,
  traduireErreur,
  traduireErreurSuppression,
} from '@/data/erreurs'
import {
  connexionBase,
  creerCompte,
  nouveauClient,
  supprimerComptes,
  type CompteTest,
} from '../helpers/comptes.ts'

const REFUS_DROITS = '42501'
const VIOLATION_UNICITE = '23505'
const VIOLATION_CHECK = '23514'
const VIOLATION_CLE_ETRANGERE = '23503'
const VERROU_ASTREINTE = 'SPV01'

let base: pg.Client
let a: CompteTest
let b: CompteTest
let admin: CompteTest

// Référentiel FICTIF, libellés suffixés pour ne gêner aucun autre test.
const s = randomUUID().slice(0, 8)
let gradeUtilise: string // utilisé seulement par l'historique de grades de B
let gradeTaux: string // utilisé seulement par un taux
let natureUtiliseeParB: string // utilisée seulement par une activité de B
let natureLibre: string // utilisée par rien
let tauxExistant: string
const gradesCrees: string[] = []
const naturesCreees: string[] = []

async function lireEnBase(table: string, colonne: string, id: string): Promise<unknown> {
  const r = await base.query(`select ${colonne} as valeur from public.${table} where id = $1`, [id])
  return r.rows[0]?.valeur
}

async function insererGrade(libelle: string): Promise<string> {
  const r = await base.query<{ id: string }>(
    `insert into public.grades (libelle, ordre) values ($1, 9999) returning id`,
    [libelle],
  )
  gradesCrees.push(r.rows[0].id)
  return r.rows[0].id
}

async function insererNature(code: string, libelle: string): Promise<string> {
  const r = await base.query<{ id: string }>(
    `insert into public.activity_types (code, libelle, est_astreinte, ordre)
     values ($1, $2, false, 9999) returning id`,
    [code, libelle],
  )
  naturesCreees.push(r.rows[0].id)
  return r.rows[0].id
}

beforeAll(async () => {
  base = await connexionBase()
  a = await creerCompte('ref-a')
  b = await creerCompte('ref-b')
  admin = await creerCompte('ref-admin')
  await base.query(`update public.profiles set role = 'admin' where id = $1`, [admin.id])

  gradeUtilise = await insererGrade(`REF Utilise ${s}`)
  gradeTaux = await insererGrade(`REF Taux ${s}`)
  natureUtiliseeParB = await insererNature(`REF-B-${s}`, `REF Utilisee ${s}`)
  natureLibre = await insererNature(`REF-L-${s}`, `REF Libre ${s}`)

  const taux = await base.query<{ id: string }>(
    `insert into public.reference_rates (grade_id, activity_type_id, taux_horaire, date_effet)
     values ($1, $2, 0, '2000-01-01') returning id`,
    [gradeTaux, natureLibre],
  )
  tauxExistant = taux.rows[0].id

  // B utilise gradeUtilise (historique) et natureUtiliseeParB (activité),
  // par l'API, comme dans l'application. L'administrateur ne voit ni l'un ni
  // l'autre (RLS).
  const historique = await b.client
    .from('user_grade_history')
    .insert({ user_id: b.id, grade_id: gradeUtilise, date_effet: '2026-01-01' })
  if (historique.error) throw new Error(`Préparation : ${historique.error.message}`)
  const activite = await b.client.from('activities').insert({
    activity_type_id: natureUtiliseeParB,
    debut: '2026-02-01T08:00:00+01:00',
    fin: '2026-02-01T09:00:00+01:00',
  })
  if (activite.error) throw new Error(`Préparation : ${activite.error.message}`)
})

afterAll(async () => {
  if (!base) return
  // Les comptes d'abord (cascade : activités et historiques), puis les taux,
  // les natures et les grades fictifs.
  await supprimerComptes(base, [a?.id, b?.id, admin?.id].filter((id): id is string => !!id))
  await base.query(
    `delete from public.reference_rates
     where grade_id = any($1::uuid[]) or activity_type_id = any($2::uuid[])`,
    [gradesCrees, naturesCreees],
  )
  await base.query(`delete from public.activity_types where id = any($1::uuid[])`, [naturesCreees])
  await base.query(`delete from public.grades where id = any($1::uuid[])`, [gradesCrees])
  await base.end()
})

describe('1. Droits sur le référentiel (cahier des charges, section 9)', () => {
  it('un non-administrateur ne peut ni créer, ni modifier, ni supprimer un grade', async () => {
    const creation = await a.client.from('grades').insert({ libelle: `REF A ${s}`, ordre: 1 })
    const modification = await a.client
      .from('grades')
      .update({ libelle: 'pirate', actif: false })
      .eq('id', gradeTaux)
      .select('id')
    const suppression = await a.client.from('grades').delete().eq('id', gradeTaux).select('id')

    expect(creation.error?.code).toBe(REFUS_DROITS)
    expect(modification.data).toEqual([])
    expect(suppression.data).toEqual([])
    expect(await lireEnBase('grades', 'libelle', gradeTaux)).toBe(`REF Taux ${s}`)
    expect(await lireEnBase('grades', 'actif', gradeTaux)).toBe(true)
  })

  it('un non-administrateur ne peut ni créer, ni modifier, ni supprimer une nature', async () => {
    const creation = await a.client
      .from('activity_types')
      .insert({ code: `REF-A-${s}`, libelle: `REF A ${s}`, ordre: 1 })
    const modification = await a.client
      .from('activity_types')
      .update({ code: 'PIRATE', actif: false })
      .eq('id', natureLibre)
      .select('id')
    const suppression = await a.client
      .from('activity_types')
      .delete()
      .eq('id', natureLibre)
      .select('id')

    expect(creation.error?.code).toBe(REFUS_DROITS)
    expect(modification.data).toEqual([])
    expect(suppression.data).toEqual([])
    expect(await lireEnBase('activity_types', 'code', natureLibre)).toBe(`REF-L-${s}`)
  })

  it('un non-administrateur ne peut ni créer, ni corriger, ni supprimer un taux', async () => {
    const creation = await a.client.from('reference_rates').insert({
      grade_id: gradeTaux,
      activity_type_id: natureLibre,
      taux_horaire: 1,
      date_effet: '2001-01-01',
    })
    const correction = await a.client
      .from('reference_rates')
      .update({ taux_horaire: 99, date_effet: '2002-02-02' })
      .eq('id', tauxExistant)
      .select('id')
    const suppression = await a.client
      .from('reference_rates')
      .delete()
      .eq('id', tauxExistant)
      .select('id')

    expect(creation.error?.code).toBe(REFUS_DROITS)
    expect(correction.data).toEqual([])
    expect(suppression.data).toEqual([])
    expect(await lireEnBase('reference_rates', 'taux_horaire', tauxExistant)).toBe('0.00')
  })

  it('l’administrateur crée, modifie, archive, réactive et supprime un grade', async () => {
    const creation = await admin.client
      .from('grades')
      .insert({ libelle: `REF Admin ${s}`, ordre: 9997 })
      .select('id, actif')
      .single()
    expect(creation.error).toBeNull()
    expect(creation.data?.actif).toBe(true) // actif dès sa création
    gradesCrees.push(creation.data!.id)
    const id = creation.data!.id

    const modification = await admin.client
      .from('grades')
      .update({ libelle: `REF Admin modifie ${s}`, ordre: 9996 })
      .eq('id', id)
      .select('id')
    const archivage = await admin.client.from('grades').update({ actif: false }).eq('id', id).select('id')
    expect(modification.data).toHaveLength(1)
    expect(archivage.data).toHaveLength(1)
    expect(await lireEnBase('grades', 'actif', id)).toBe(false)

    const reactivation = await admin.client.from('grades').update({ actif: true }).eq('id', id).select('id')
    expect(reactivation.data).toHaveLength(1)

    const suppression = await admin.client.from('grades').delete().eq('id', id).select('id')
    expect(suppression.error).toBeNull()
    expect(suppression.data).toHaveLength(1)
  })

  it('l’administrateur corrige le taux et la date d’effet d’une ligne de taux', async () => {
    const correction = await admin.client
      .from('reference_rates')
      .update({ taux_horaire: 1.5, date_effet: '2000-01-02' })
      .eq('id', tauxExistant)
      .select('taux_horaire, date_effet')
      .single()

    expect(correction.error).toBeNull()
    expect(correction.data).toEqual({ taux_horaire: 1.5, date_effet: '2000-01-02' })
  })
})

describe('2. Doublons refusés', () => {
  it('libellé de grade, casse différente comprise (D-024)', async () => {
    const { error } = await admin.client
      .from('grades')
      .insert({ libelle: `ref utilise ${s}`.toUpperCase(), ordre: 1 })

    expect(error?.code).toBe(VIOLATION_UNICITE)
    const traduite = traduireErreur(error!)
    expect(traduite).toBeInstanceOf(ErreurDoublon)
    expect((traduite as ErreurDoublon).cas).toBe('libelle_grade')
  })

  it('libellé de grade identique à celui d’un grade archivé (D-024)', async () => {
    const archive = await insererGrade(`REF Archive ${s}`)
    await base.query(`update public.grades set actif = false where id = $1`, [archive])

    const { error } = await admin.client.from('grades').insert({ libelle: `REF Archive ${s}`, ordre: 1 })

    expect((traduireErreur(error!) as ErreurDoublon).cas).toBe('libelle_grade')
  })

  it('renommer un grade avec le libellé d’un autre est refusé (D-024)', async () => {
    const { error } = await admin.client
      .from('grades')
      .update({ libelle: `REF UTILISE ${s}` })
      .eq('id', gradeTaux)

    expect((traduireErreur(error!) as ErreurDoublon).cas).toBe('libelle_grade')
  })

  it('libellé de nature, casse différente comprise (D-026)', async () => {
    const { error } = await admin.client
      .from('activity_types')
      .insert({ code: `REF-X-${s}`, libelle: `ref libre ${s}`, ordre: 1 })

    expect(error?.code).toBe(VIOLATION_UNICITE)
    expect((traduireErreur(error!) as ErreurDoublon).cas).toBe('libelle_nature')
  })

  it('code de nature, casse différente comprise (D-023)', async () => {
    const { error } = await admin.client
      .from('activity_types')
      .insert({ code: `ref-l-${s}`, libelle: `REF Autre ${s}`, ordre: 1 })

    expect(error?.code).toBe(VIOLATION_UNICITE)
    expect((traduireErreur(error!) as ErreurDoublon).cas).toBe('code_nature')
  })

  it('taux sur le même (grade, nature, date d’effet)', async () => {
    const date = (await lireEnBase('reference_rates', "to_char(date_effet, 'YYYY-MM-DD')", tauxExistant)) as string
    const { error } = await admin.client.from('reference_rates').insert({
      grade_id: gradeTaux,
      activity_type_id: natureLibre,
      taux_horaire: 3,
      date_effet: date,
    })

    expect(error?.code).toBe(VIOLATION_UNICITE)
    expect((traduireErreur(error!) as ErreurDoublon).cas).toBe('taux')
  })

  it('date d’effet de grade déjà prise pour un même utilisateur (D-028), à l’ajout comme à la correction', async () => {
    const premiere = await a.client
      .from('user_grade_history')
      .insert({ user_id: a.id, grade_id: gradeTaux, date_effet: '2026-03-01' })
      .select('id')
      .single()
    expect(premiere.error).toBeNull()
    const seconde = await a.client
      .from('user_grade_history')
      .insert({ user_id: a.id, grade_id: gradeUtilise, date_effet: '2026-04-01' })
      .select('id')
      .single()
    expect(seconde.error).toBeNull()

    const ajout = await a.client
      .from('user_grade_history')
      .insert({ user_id: a.id, grade_id: gradeUtilise, date_effet: '2026-03-01' })
    expect(ajout.error?.code).toBe(VIOLATION_UNICITE)
    expect((traduireErreur(ajout.error!) as ErreurDoublon).cas).toBe('date_effet_grade')

    const correction = await a.client
      .from('user_grade_history')
      .update({ date_effet: '2026-03-01' })
      .eq('id', seconde.data!.id)
    expect((traduireErreur(correction.error!) as ErreurDoublon).cas).toBe('date_effet_grade')
  })

  it('la même date d’effet est acceptée pour deux utilisateurs différents (D-028)', async () => {
    // B a déjà une ligne au 01/01/2026 (préparation) : A peut avoir la même date.
    const { error } = await a.client
      .from('user_grade_history')
      .insert({ user_id: a.id, grade_id: gradeTaux, date_effet: '2026-01-01' })

    expect(error).toBeNull()
  })
})

describe('3. Taux positif ou nul (D-027)', () => {
  it('un taux négatif est refusé', async () => {
    const { error } = await admin.client.from('reference_rates').insert({
      grade_id: gradeTaux,
      activity_type_id: natureLibre,
      taux_horaire: -0.01,
      date_effet: '2003-01-01',
    })

    expect(error?.code).toBe(VIOLATION_CHECK)
    expect(traduireErreur(error!)).toBeInstanceOf(ErreurTauxNegatif)
  })

  it('corriger un taux en négatif est refusé', async () => {
    const { error } = await admin.client
      .from('reference_rates')
      .update({ taux_horaire: -1 })
      .eq('id', tauxExistant)

    expect(traduireErreur(error!)).toBeInstanceOf(ErreurTauxNegatif)
  })

  it('un taux nul est accepté', async () => {
    const { data, error } = await admin.client
      .from('reference_rates')
      .insert({ grade_id: gradeTaux, activity_type_id: natureLibre, taux_horaire: 0, date_effet: '2004-01-01' })
      .select('taux_horaire')
      .single()

    expect(error).toBeNull()
    expect(data?.taux_horaire).toBe(0)
  })
})

describe('4. Suppression d’un élément déjà utilisé (D-018)', () => {
  it('un grade utilisé par l’historique d’un autre utilisateur seulement : refusée', async () => {
    const { error } = await admin.client.from('grades').delete().eq('id', gradeUtilise)

    expect(error?.code).toBe(VIOLATION_CLE_ETRANGERE)
    expect(traduireErreurSuppression(error!)).toBeInstanceOf(ErreurDejaServi)
    expect(await lireEnBase('grades', 'id', gradeUtilise)).toBe(gradeUtilise)
  })

  it('un grade utilisé par un taux : refusée', async () => {
    const { error } = await admin.client.from('grades').delete().eq('id', gradeTaux)

    expect(traduireErreurSuppression(error!)).toBeInstanceOf(ErreurDejaServi)
  })

  it('une nature utilisée par une activité d’un autre utilisateur seulement : refusée', async () => {
    const { error } = await admin.client.from('activity_types').delete().eq('id', natureUtiliseeParB)

    expect(error?.code).toBe(VIOLATION_CLE_ETRANGERE)
    expect(traduireErreurSuppression(error!)).toBeInstanceOf(ErreurDejaServi)
    expect(await lireEnBase('activity_types', 'id', natureUtiliseeParB)).toBe(natureUtiliseeParB)
  })

  it('une nature utilisée par un taux : refusée', async () => {
    const { error } = await admin.client.from('activity_types').delete().eq('id', natureLibre)

    expect(traduireErreurSuppression(error!)).toBeInstanceOf(ErreurDejaServi)
  })

  it('un grade et une nature inutilisés : acceptée', async () => {
    const grade = await insererGrade(`REF Jetable ${s}`)
    const nature = await insererNature(`REF-J-${s}`, `REF Jetable ${s}`)

    const g = await admin.client.from('grades').delete().eq('id', grade).select('id')
    const n = await admin.client.from('activity_types').delete().eq('id', nature).select('id')

    expect(g.error).toBeNull()
    expect(g.data).toHaveLength(1)
    expect(n.error).toBeNull()
    expect(n.data).toHaveLength(1)
  })
})

describe('5. Verrou de « est une astreinte » (D-022)', () => {
  it('changement refusé si la nature est utilisée, même par un autre utilisateur seulement', async () => {
    // L'administrateur ne voit pas l'activité de B (RLS)…
    const visibles = await admin.client.from('activities').select('id')
    expect(visibles.data).toEqual([])

    // … mais le verrou la voit.
    const { error } = await admin.client
      .from('activity_types')
      .update({ est_astreinte: true })
      .eq('id', natureUtiliseeParB)

    expect(error?.code).toBe(VERROU_ASTREINTE)
    expect(error?.message).toBe('est_astreinte_verrouille')
    // Aucune autre donnée n'est révélée.
    expect(error?.details ?? null).toBeNull()
    expect(traduireErreur(error!)).toBeInstanceOf(ErreurAstreinteVerrouillee)
    expect(await lireEnBase('activity_types', 'est_astreinte', natureUtiliseeParB)).toBe(false)
  })

  it('libellé, code et ordre restent modifiables sur une nature utilisée', async () => {
    const { data, error } = await admin.client
      .from('activity_types')
      .update({ libelle: `REF Utilisee bis ${s}`, code: `REF-B2-${s}`, ordre: 9990 })
      .eq('id', natureUtiliseeParB)
      .select('id')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('renvoyer la même valeur de « est une astreinte » est accepté', async () => {
    const { error } = await admin.client
      .from('activity_types')
      .update({ est_astreinte: false, ordre: 9991 })
      .eq('id', natureUtiliseeParB)

    expect(error).toBeNull()
  })

  it('changement accepté si aucune activité n’utilise la nature', async () => {
    const aller = await admin.client
      .from('activity_types')
      .update({ est_astreinte: true })
      .eq('id', natureLibre)
      .select('est_astreinte')
      .single()
    const retour = await admin.client
      .from('activity_types')
      .update({ est_astreinte: false })
      .eq('id', natureLibre)
      .select('est_astreinte')
      .single()

    expect(aller.error).toBeNull()
    expect(aller.data?.est_astreinte).toBe(true)
    expect(retour.data?.est_astreinte).toBe(false)
  })

  it('la fonction du verrou n’est exécutable ni par anon ni par authenticated', async () => {
    const r = await base.query<{ anon: boolean; connecte: boolean }>(
      `select has_function_privilege('anon', 'public.verrouiller_est_astreinte()', 'execute') as anon,
              has_function_privilege('authenticated', 'public.verrouiller_est_astreinte()', 'execute') as connecte`,
    )
    expect(r.rows[0]).toEqual({ anon: false, connecte: false })
  })
})

describe('6. nature_utilisee() (D-022)', () => {
  it('vraie pour une nature utilisée par un autre utilisateur seulement, fausse sinon', async () => {
    const utilisee = await admin.client.rpc('nature_utilisee', { p_activity_type_id: natureUtiliseeParB })
    const libre = await admin.client.rpc('nature_utilisee', { p_activity_type_id: natureLibre })

    expect(utilisee.error).toBeNull()
    expect(utilisee.data).toBe(true)
    expect(libre.data).toBe(false)
  })

  it('refusée à un non-administrateur', async () => {
    const { data, error } = await b.client.rpc('nature_utilisee', { p_activity_type_id: natureUtiliseeParB })

    expect(error?.code).toBe(REFUS_DROITS)
    expect(data).toBeNull()
  })

  it('aucun accès pour un visiteur non connecté (D-009)', async () => {
    const anonyme = nouveauClient()
    const { data, error } = await anonyme.rpc('nature_utilisee', { p_activity_type_id: natureUtiliseeParB })

    expect(error).not.toBeNull()
    expect(data).toBeNull()
    const r = await base.query<{ anon: boolean; connecte: boolean }>(
      `select has_function_privilege('anon', 'public.nature_utilisee(uuid)', 'execute') as anon,
              has_function_privilege('authenticated', 'public.nature_utilisee(uuid)', 'execute') as connecte`,
    )
    expect(r.rows[0]).toEqual({ anon: false, connecte: true })
  })
})

describe('7. Historique de grades : chacun ses lignes', () => {
  it('A ne lit que ses propres lignes', async () => {
    const { data, error } = await a.client.from('user_grade_history').select('user_id')

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    expect(data!.every((ligne) => ligne.user_id === a.id)).toBe(true)
  })

  it('A ne peut ni modifier ni supprimer la ligne de B', async () => {
    const ligneB = await base.query<{ id: string }>(
      `select id from public.user_grade_history where user_id = $1`,
      [b.id],
    )
    const id = ligneB.rows[0].id

    const modification = await a.client
      .from('user_grade_history')
      .update({ date_effet: '2020-01-01' })
      .eq('id', id)
      .select('id')
    const suppression = await a.client.from('user_grade_history').delete().eq('id', id).select('id')

    expect(modification.data).toEqual([])
    expect(suppression.data).toEqual([])
    expect(await lireEnBase('user_grade_history', "to_char(date_effet, 'YYYY-MM-DD')", id)).toBe(
      '2026-01-01',
    )
  })

  it('A ne peut pas créer une ligne au nom de B, ni réattribuer la sienne à B', async () => {
    const creation = await a.client
      .from('user_grade_history')
      .insert({ user_id: b.id, grade_id: gradeTaux, date_effet: '2027-01-01' })
    expect(creation.error?.code).toBe(REFUS_DROITS)

    const sienne = await a.client.from('user_grade_history').select('id').limit(1).single()
    const reattribution = await a.client
      .from('user_grade_history')
      .update({ user_id: b.id })
      .eq('id', sienne.data!.id)
    expect(reattribution.error?.code).toBe(REFUS_DROITS)
  })

  it('A corrige et supprime ses propres lignes', async () => {
    const ajout = await a.client
      .from('user_grade_history')
      .insert({ user_id: a.id, grade_id: gradeTaux, date_effet: '2028-01-01' })
      .select('id')
      .single()
    expect(ajout.error).toBeNull()

    const correction = await a.client
      .from('user_grade_history')
      .update({ grade_id: gradeUtilise, date_effet: '2028-02-01' })
      .eq('id', ajout.data!.id)
      .select('id')
    const suppression = await a.client
      .from('user_grade_history')
      .delete()
      .eq('id', ajout.data!.id)
      .select('id')

    expect(correction.data).toHaveLength(1)
    expect(suppression.data).toHaveLength(1)
  })
})

describe('8. Lecture du rôle', () => {
  it('chacun lit son propre rôle et son statut actif', async () => {
    const utilisateur = await a.client.from('profiles').select('role, actif').eq('id', a.id).single()
    const administrateur = await admin.client
      .from('profiles')
      .select('role, actif')
      .eq('id', admin.id)
      .single()

    expect(utilisateur.data).toEqual({ role: 'user', actif: true })
    expect(administrateur.data).toEqual({ role: 'admin', actif: true })
  })

  it('le rôle d’un autre utilisateur est invisible', async () => {
    const { data, error } = await a.client.from('profiles').select('role').eq('id', admin.id)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})
