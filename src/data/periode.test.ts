import { describe, expect, it } from 'vitest'
import { calculerPeriode } from './calcul'
import type {
  LigneActivite,
  LigneHistoriqueGrade,
  LigneNature,
  LigneTaux,
} from './conversions'
import { enveloppeDeCalcul, estDansPeriode, lireActivitesPourCalcul } from './periode'
import type { Periode, SourceActivites } from './periode'

// Référentiel de test. Tous les taux sont fictifs.
const natures: LigneNature[] = [
  { id: 'astreinte', code: 'AST', libelle: 'Astreinte', est_astreinte: true, actif: true, ordre: 1 },
  { id: 'intervention', code: 'INT', libelle: 'Intervention', est_astreinte: false, actif: true, ordre: 2 },
]
const historique: LigneHistoriqueGrade[] = [
  { id: 'h1', user_id: 'u1', grade_id: 'sapeur', date_effet: '2025-01-01' },
]
const taux: LigneTaux[] = [
  { id: 't1', grade_id: 'sapeur', activity_type_id: 'astreinte', taux_horaire: 2, date_effet: '2025-01-01' },
  { id: 't2', grade_id: 'sapeur', activity_type_id: 'intervention', taux_horaire: 12, date_effet: '2025-01-01' },
]

// Décembre 2026, heure de Paris (UTC+1 en hiver).
const decembre: Periode = {
  debut: new Date('2026-12-01T00:00:00+01:00'),
  fin: new Date('2027-01-01T00:00:00+01:00'),
}

function ligne(id: string, natureId: string, debut: string, fin: string): LigneActivite {
  return {
    id,
    user_id: 'u1',
    activity_type_id: natureId,
    debut: `${debut}:00+01:00`,
    fin: `${fin}:00+01:00`,
    note: null,
    cree_le: '2026-01-01T00:00:00+00:00',
    modifie_le: '2026-01-01T00:00:00+00:00',
  }
}

// Source en mémoire : applique les mêmes filtres que les requêtes Supabase.
function sourceEnMemoire(lignes: LigneActivite[]): SourceActivites & { plagesLues: Periode[] } {
  const plagesLues: Periode[] = []
  return {
    plagesLues,
    async astreintesCommencantDans(periode) {
      return lignes.filter(
        (l) => l.activity_type_id === 'astreinte' && estDansPeriode(new Date(l.debut), periode),
      )
    },
    async activitesChevauchant(plage) {
      plagesLues.push(plage)
      return lignes.filter(
        (l) =>
          new Date(l.debut).getTime() < plage.fin.getTime() &&
          new Date(l.fin).getTime() > plage.debut.getTime(),
      )
    },
  }
}

async function calculer(lignes: LigneActivite[], periode: Periode) {
  const source = sourceEnMemoire(lignes)
  const lues = await lireActivitesPourCalcul(source, periode)
  return { source, lues, calcul: calculerPeriode(lues, natures, historique, taux, periode) }
}

describe('estDansPeriode', () => {
  it('inclut le début de la période et exclut sa fin', () => {
    expect(estDansPeriode(decembre.debut, decembre)).toBe(true)
    expect(estDansPeriode(new Date('2026-12-31T23:59:00+01:00'), decembre)).toBe(true)
    expect(estDansPeriode(decembre.fin, decembre)).toBe(false)
    expect(estDansPeriode(new Date('2026-11-30T23:59:00+01:00'), decembre)).toBe(false)
  })
})

describe('enveloppeDeCalcul', () => {
  it('vaut la période quand aucune astreinte ne déborde', () => {
    expect(
      enveloppeDeCalcul(decembre, [
        { debut: new Date('2026-12-05T08:00:00+01:00'), fin: new Date('2026-12-05T12:00:00+01:00') },
      ]),
    ).toEqual(decembre)
    expect(enveloppeDeCalcul(decembre, [])).toEqual(decembre)
  })

  it('s’étend jusqu’à la fin de l’astreinte la plus tardive', () => {
    expect(
      enveloppeDeCalcul(decembre, [
        { debut: new Date('2026-12-31T20:00:00+01:00'), fin: new Date('2027-01-01T08:00:00+01:00') },
        { debut: new Date('2026-12-30T20:00:00+01:00'), fin: new Date('2026-12-31T08:00:00+01:00') },
      ]),
    ).toEqual({ debut: decembre.debut, fin: new Date('2027-01-01T08:00:00+01:00') })
  })
})

describe('lireActivitesPourCalcul puis calculerPeriode', () => {
  it('déduit une intervention commencée avant la période : astreinte 01/12 00:00–08:00, intervention 30/11 23:30–01/12 00:30 → 30 min déduites', async () => {
    const { lues, calcul } = await calculer(
      [
        ligne('a1', 'astreinte', '2026-12-01T00:00', '2026-12-01T08:00'),
        ligne('i1', 'intervention', '2026-11-30T23:30', '2026-12-01T00:30'),
      ],
      decembre,
    )

    // L'intervention est lue (elle chevauche la période) mais n'en fait pas partie.
    expect(lues.map((l) => l.id).toSorted()).toEqual(['a1', 'i1'])
    expect(calcul.activites.map((l) => l.id)).toEqual(['a1'])
    expect(calcul.resultats[0]).toMatchObject({
      id: 'a1',
      dureeDeclareeMin: 480,
      dureeDeduiteMin: 30,
      dureeNetteMin: 450,
      montantCentimes: 1500,
      statut: 'ok',
    })
    expect(calcul.totaux).toMatchObject({
      montantCentimes: 1500,
      astreintes: { dureeDeclareeMin: 480, dureeDeduiteMin: 30, dureeNetteMin: 450 },
      nbOk: 1,
    })
  })

  it('déduit une intervention hors période d’une astreinte à cheval sur la fin de période', async () => {
    const { source, calcul } = await calculer(
      [
        ligne('a1', 'astreinte', '2026-12-31T20:00', '2027-01-01T08:00'),
        ligne('i1', 'intervention', '2027-01-01T02:00', '2027-01-01T03:00'),
      ],
      decembre,
    )

    // La lecture est élargie jusqu'à la fin de l'astreinte.
    expect(source.plagesLues).toEqual([
      { debut: decembre.debut, fin: new Date('2027-01-01T08:00:00+01:00') },
    ])
    expect(calcul.activites.map((l) => l.id)).toEqual(['a1'])
    expect(calcul.resultats[0]).toMatchObject({
      dureeDeclareeMin: 720,
      dureeDeduiteMin: 60,
      dureeNetteMin: 660,
      statut: 'ok',
    })
  })

  it('détecte le chevauchement avec une astreinte commencée dans la période précédente', async () => {
    const { calcul } = await calculer(
      [
        ligne('precedente', 'astreinte', '2026-11-30T20:00', '2026-12-01T08:00'),
        ligne('a1', 'astreinte', '2026-12-01T06:00', '2026-12-01T12:00'),
        ligne('a2', 'astreinte', '2026-12-02T08:00', '2026-12-02T12:00'),
      ],
      decembre,
    )

    expect(calcul.activites.map((l) => l.id)).toEqual(['a1', 'a2'])
    expect(calcul.resultats[0]).toMatchObject({ id: 'a1', statut: 'chevauchement_astreintes' })
    expect(calcul.resultats[1]).toMatchObject({ id: 'a2', statut: 'ok' })
    expect(calcul.totaux.anomalies.chevauchement_astreintes).toBe(1)
  })

  it('rattache chaque activité à la période où elle commence et trie par début', async () => {
    const { calcul } = await calculer(
      [
        ligne('i2', 'intervention', '2026-12-10T10:00', '2026-12-10T11:00'),
        ligne('avant', 'intervention', '2026-11-30T23:00', '2026-12-01T01:00'),
        ligne('i1', 'intervention', '2026-12-01T00:00', '2026-12-01T01:00'),
        ligne('apres', 'intervention', '2027-01-01T00:00', '2027-01-01T01:00'),
      ],
      decembre,
    )

    expect(calcul.activites.map((l) => l.id)).toEqual(['i1', 'i2'])
    expect(calcul.resultats.map((r) => r.id)).toEqual(['i1', 'i2'])
    expect(calcul.totaux).toMatchObject({ montantCentimes: 2400, nbOk: 2 })
  })

  it('renvoie des totaux à zéro pour une période sans activité', async () => {
    const { calcul } = await calculer([], decembre)

    expect(calcul.activites).toEqual([])
    expect(calcul.resultats).toEqual([])
    expect(calcul.totaux).toMatchObject({ montantCentimes: 0, nbOk: 0 })
  })
})
