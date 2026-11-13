// Tests automatisés du contrôle en base du chevauchement d'astreintes (D-010,
// cahier des charges section 9) : trigger de la migration
// « chevauchement_astreintes ».
//
// Les vérifications passent par l'API Supabase avec la clé PUBLIQUE et un
// compte connecté, exactement comme l'application. Le rôle postgres ne sert
// qu'à préparer et nettoyer les données, et au test du verrou (cas 8b).
//
// Prérequis : Supabase local démarré (npx supabase start). Lancement :
// npm run test:rls

import { randomUUID } from 'node:crypto'
import type pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  connexionBase,
  creerCompte,
  supprimerComptes,
  type ClientTest,
  type CompteTest,
} from '../helpers/comptes.ts'

// Erreur levée par le trigger : code et message stables.
const CODE_CHEVAUCHEMENT = '23P01'
const MESSAGE_CHEVAUCHEMENT = 'chevauchement_astreintes'
const REFUS_DROITS = '42501' // RLS ou droits insuffisants

let base: pg.Client
let a: CompteTest
let b: CompteTest

// Natures FICTIVES créées pour ces tests (aucun taux).
const suffixe = randomUUID().slice(0, 8)
let natureAstreinte: string
let natureIntervention: string

// Heure de Paris en hiver (UTC+1) : toutes les dates des tests sont en mars 2026,
// avant le passage à l'heure d'été.
function heure(jour: string, heureMinute: string): string {
  return `2026-03-${jour}T${heureMinute}:00+01:00`
}

function inserer(
  client: ClientTest,
  natureId: string,
  debut: string,
  fin: string,
  userId?: string,
) {
  return client
    .from('activities')
    .insert({ activity_type_id: natureId, debut, fin, ...(userId ? { user_id: userId } : {}) })
    .select('id')
    .single()
}

async function insererOuEchouer(
  client: ClientTest,
  natureId: string,
  debut: string,
  fin: string,
): Promise<string> {
  const { data, error } = await inserer(client, natureId, debut, fin)
  if (error) throw new Error(`Préparation : insertion impossible (${error.message})`)
  return data.id
}

beforeAll(async () => {
  base = await connexionBase()
  a = await creerCompte('chev-a')
  b = await creerCompte('chev-b')

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
})

afterAll(async () => {
  if (!base) return
  // Les comptes d'abord (cascade : activités), puis les natures fictives.
  await supprimerComptes(base, [a?.id, b?.id].filter((id): id is string => !!id))
  await base.query(`delete from public.activity_types where id = any($1::uuid[])`, [
    [natureAstreinte, natureIntervention].filter(Boolean),
  ])
  await base.end()
})

describe("chevauchement d'astreintes (D-010)", () => {
  it('1. refuse une astreinte qui en chevauche une autre à l’insertion', async () => {
    await insererOuEchouer(a.client, natureAstreinte, heure('01', '08:00'), heure('01', '12:00'))

    const { data, error } = await inserer(
      a.client,
      natureAstreinte,
      heure('01', '10:00'),
      heure('01', '14:00'),
    )

    expect(data).toBeNull()
    expect(error?.code).toBe(CODE_CHEVAUCHEMENT)
    expect(error?.message).toBe(MESSAGE_CHEVAUCHEMENT)
  })

  it('1 bis. refuse aussi une astreinte contenue dans une autre, ou qui la contient', async () => {
    const dedans = await inserer(a.client, natureAstreinte, heure('01', '09:00'), heure('01', '10:00'))
    const autour = await inserer(a.client, natureAstreinte, heure('01', '07:00'), heure('01', '13:00'))

    expect(dedans.error?.code).toBe(CODE_CHEVAUCHEMENT)
    expect(autour.error?.code).toBe(CODE_CHEVAUCHEMENT)
  })

  it('2. refuse la modification qui crée un chevauchement, sans rien modifier', async () => {
    await insererOuEchouer(a.client, natureAstreinte, heure('02', '08:00'), heure('02', '12:00'))
    const seconde = await insererOuEchouer(
      a.client,
      natureAstreinte,
      heure('02', '14:00'),
      heure('02', '18:00'),
    )

    const { error } = await a.client
      .from('activities')
      .update({ debut: heure('02', '11:00') })
      .eq('id', seconde)

    expect(error?.code).toBe(CODE_CHEVAUCHEMENT)
    expect(error?.message).toBe(MESSAGE_CHEVAUCHEMENT)
    const enBase = await base.query<{ debut: Date }>(
      `select debut from public.activities where id = $1`,
      [seconde],
    )
    expect(enBase.rows[0].debut.toISOString()).toBe(new Date(heure('02', '14:00')).toISOString())
  })

  it('3. accepte la modification d’une astreinte sur elle-même', async () => {
    const id = await insererOuEchouer(
      a.client,
      natureAstreinte,
      heure('03', '08:00'),
      heure('03', '12:00'),
    )

    // Nouvelle plage qui recouvre l'ancienne : l'astreinte ne se gêne pas elle-même.
    const horaires = await a.client
      .from('activities')
      .update({ debut: heure('03', '09:00'), fin: heure('03', '13:00') })
      .eq('id', id)
      .select('id')
    const note = await a.client
      .from('activities')
      .update({ note: 'note de test' })
      .eq('id', id)
      .select('id')

    expect(horaires.error).toBeNull()
    expect(horaires.data).toHaveLength(1)
    expect(note.error).toBeNull()
    expect(note.data).toHaveLength(1)
  })

  it('4. accepte deux astreintes contiguës', async () => {
    const premiere = await inserer(a.client, natureAstreinte, heure('04', '08:00'), heure('04', '12:00'))
    const apres = await inserer(a.client, natureAstreinte, heure('04', '12:00'), heure('04', '18:00'))
    const avant = await inserer(a.client, natureAstreinte, heure('04', '06:00'), heure('04', '08:00'))

    expect(premiere.error).toBeNull()
    expect(apres.error).toBeNull()
    expect(avant.error).toBeNull()
  })

  it('5. accepte une astreinte et une intervention qui se chevauchent, dans les deux ordres', async () => {
    const astreinte = await inserer(a.client, natureAstreinte, heure('05', '08:00'), heure('05', '12:00'))
    const interventionApres = await inserer(
      a.client,
      natureIntervention,
      heure('05', '09:00'),
      heure('05', '10:00'),
    )
    const interventionAvant = await inserer(
      a.client,
      natureIntervention,
      heure('06', '09:00'),
      heure('06', '10:00'),
    )
    const astreinteApres = await inserer(
      a.client,
      natureAstreinte,
      heure('06', '08:00'),
      heure('06', '12:00'),
    )

    expect(astreinte.error).toBeNull()
    expect(interventionApres.error).toBeNull()
    expect(interventionAvant.error).toBeNull()
    expect(astreinteApres.error).toBeNull()
  })

  it('6. accepte les astreintes de deux utilisateurs différents sur le même créneau', async () => {
    const deA = await inserer(a.client, natureAstreinte, heure('07', '08:00'), heure('07', '12:00'))
    const deB = await inserer(b.client, natureAstreinte, heure('07', '08:00'), heure('07', '12:00'))

    expect(deA.error).toBeNull()
    expect(deB.error).toBeNull()
  })

  it('7. refuse de changer une intervention en astreinte si elle chevauche une astreinte', async () => {
    await insererOuEchouer(a.client, natureAstreinte, heure('08', '08:00'), heure('08', '12:00'))
    const intervention = await insererOuEchouer(
      a.client,
      natureIntervention,
      heure('08', '09:00'),
      heure('08', '10:00'),
    )

    const { error } = await a.client
      .from('activities')
      .update({ activity_type_id: natureAstreinte })
      .eq('id', intervention)

    expect(error?.code).toBe(CODE_CHEVAUCHEMENT)
    expect(error?.message).toBe(MESSAGE_CHEVAUCHEMENT)
  })

  it('8. deux insertions lancées en parallèle par l’API : exactement une réussit', async () => {
    // Plusieurs tours, sur des jours différents, pour multiplier les entrelacements.
    for (const jour of ['10', '11', '12', '13', '14']) {
      const resultats = await Promise.all([
        inserer(a.client, natureAstreinte, heure(jour, '08:00'), heure(jour, '12:00')),
        inserer(a.client, natureAstreinte, heure(jour, '10:00'), heure(jour, '14:00')),
      ])

      const reussites = resultats.filter((r) => r.error === null)
      const refus = resultats.filter((r) => r.error !== null)
      expect(reussites).toHaveLength(1)
      expect(refus).toHaveLength(1)
      expect(refus[0].error?.code).toBe(CODE_CHEVAUCHEMENT)
    }
  })

  it('8 bis. verrou : une insertion attend la fin de la transaction concurrente, puis est refusée', async () => {
    // Test déterministe, avec deux connexions directes : la première insère sans
    // valider ; la seconde doit rester en attente du verrou, puis échouer une
    // fois la première validée. Sans verrou, la seconde réussirait aussitôt.
    const connexion1 = await connexionBase()
    const connexion2 = await connexionBase()
    const sql = `insert into public.activities (user_id, activity_type_id, debut, fin)
                 values ($1, $2, $3, $4)`
    try {
      await connexion1.query('begin')
      await connexion1.query(sql, [a.id, natureAstreinte, heure('20', '08:00'), heure('20', '12:00')])

      let terminee = false
      const seconde = connexion2
        .query(sql, [a.id, natureAstreinte, heure('20', '10:00'), heure('20', '14:00')])
        .then(
          () => ({ code: null as string | null, message: null as string | null }),
          (erreur: { code?: string; message?: string }) => ({
            code: erreur.code ?? null,
            message: erreur.message ?? null,
          }),
        )
        .finally(() => {
          terminee = true
        })

      // Tant que la première transaction n'est pas validée, la seconde attend.
      await new Promise((resolve) => setTimeout(resolve, 500))
      expect(terminee).toBe(false)

      await connexion1.query('commit')
      const issue = await seconde

      expect(issue.code).toBe(CODE_CHEVAUCHEMENT)
      expect(issue.message).toBe(MESSAGE_CHEVAUCHEMENT)
    } finally {
      await connexion1.query('rollback').catch(() => {})
      await connexion1.end()
      await connexion2.end()
    }
  })

  it('9. insérer au nom d’un autre utilisateur renvoie une erreur de droits, jamais « chevauchement_astreintes »', async () => {
    // B a une astreinte le 07/03 de 08:00 à 12:00 (cas 6).
    const surSonAstreinte = await inserer(
      a.client,
      natureAstreinte,
      heure('07', '09:00'),
      heure('07', '11:00'),
      b.id,
    )
    // Créneau où B n'a rien : la réponse doit être la même (aucune fuite).
    const surCreneauLibre = await inserer(
      a.client,
      natureAstreinte,
      heure('25', '09:00'),
      heure('25', '11:00'),
      b.id,
    )

    for (const { data, error } of [surSonAstreinte, surCreneauLibre]) {
      expect(data).toBeNull()
      expect(error?.code).toBe(REFUS_DROITS)
      expect(error?.message).not.toContain(MESSAGE_CHEVAUCHEMENT)
    }
    expect(surSonAstreinte.error?.message).toBe(surCreneauLibre.error?.message)
  })
})
