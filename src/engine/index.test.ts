import { describe, expect, it } from 'vitest'
import { paris } from './aides-test'
import { calculerActivites, totaliser } from './index'
import type { ActiviteEntree, HistoriqueGrade, Nature, Taux } from './index'

// Référentiel de test. Tous les taux sont fictifs (2,00 €/h et 12,00 €/h).
const natures: Nature[] = [
  { id: 'astreinte', estAstreinte: true },
  { id: 'intervention', estAstreinte: false },
  { id: 'manoeuvre', estAstreinte: false }, // volontairement sans taux
]
const historiqueGrades: HistoriqueGrade[] = [{ gradeId: 'sapeur', dateEffet: '2025-01-01' }]
const taux: Taux[] = [
  { gradeId: 'sapeur', natureId: 'astreinte', centimesParHeure: 200, dateEffet: '2025-01-01' },
  { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1200, dateEffet: '2025-01-01' },
]

function activite(id: string, natureId: string, debut: string, fin: string): ActiviteEntree {
  return { id, natureId, debut: paris(debut), fin: paris(fin) }
}

function calculer(activites: ActiviteEntree[]) {
  return calculerActivites(activites, natures, historiqueGrades, taux)
}

describe('calculerActivites', () => {
  it('exemple de référence du 26/06/2026 : 6,50 € + 9,00 € = 15,50 €', () => {
    const resultats = calculer([
      activite('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
      activite('i1', 'intervention', '2026-06-26 08:00', '2026-06-26 08:45'),
    ])

    expect(resultats).toEqual([
      {
        id: 'a1',
        natureId: 'astreinte',
        estAstreinte: true,
        dureeDeclareeMin: 240,
        dureeDeduiteMin: 45,
        dureeNetteMin: 195,
        centimesParHeure: 200,
        montantCentimes: 650,
        statut: 'ok',
      },
      {
        id: 'i1',
        natureId: 'intervention',
        estAstreinte: false,
        dureeDeclareeMin: 45,
        dureeDeduiteMin: 0,
        dureeNetteMin: 45,
        centimesParHeure: 1200,
        montantCentimes: 900,
        statut: 'ok',
      },
    ])
    expect(totaliser(resultats)).toEqual({
      montantCentimes: 1550,
      astreintes: { dureeDeclareeMin: 240, dureeDeduiteMin: 45, dureeNetteMin: 195 },
      parNature: [
        { natureId: 'astreinte', nombre: 1, dureeRetenueMin: 195, montantCentimes: 650 },
        { natureId: 'intervention', nombre: 1, dureeRetenueMin: 45, montantCentimes: 900 },
      ],
      nbOk: 2,
      anomalies: { taux_manquant: 0, chevauchement_astreintes: 0 },
    })
  })

  it("renvoie les résultats dans l'ordre des activités reçues", () => {
    const resultats = calculer([
      activite('i2', 'intervention', '2026-06-27 10:00', '2026-06-27 11:00'),
      activite('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
      activite('i1', 'intervention', '2026-06-26 09:00', '2026-06-26 09:30'),
    ])

    expect(resultats.map((resultat) => resultat.id)).toEqual(['i2', 'a1', 'i1'])
  })

  it('astreinte intégralement consommée : nette 0, montant 0, statut ok', () => {
    const resultats = calculer([
      activite('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
      activite('i1', 'intervention', '2026-06-26 07:00', '2026-06-26 13:00'),
    ])

    expect(resultats[0]).toMatchObject({
      dureeDeclareeMin: 240,
      dureeDeduiteMin: 240,
      dureeNetteMin: 0,
      montantCentimes: 0,
      statut: 'ok',
    })
  })

  it('une activité hors astreinte ne déduit rien et garde sa durée déclarée', () => {
    const resultats = calculer([
      activite('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
      activite('i1', 'intervention', '2026-06-26 14:00', '2026-06-26 15:30'),
    ])

    expect(resultats[0]).toMatchObject({ dureeDeduiteMin: 0, dureeNetteMin: 240, montantCentimes: 800 })
    expect(resultats[1]).toMatchObject({
      dureeDeclareeMin: 90,
      dureeDeduiteMin: 0,
      dureeNetteMin: 90,
      montantCentimes: 1800,
    })
  })

  it("changement d'heure : astreinte de 13 h puis de 11 h, payées sur leur durée réelle", () => {
    const resultats = calculer([
      activite('hiver', 'astreinte', '2026-10-24 20:00', '2026-10-25 08:00'),
      activite('ete', 'astreinte', '2027-03-27 20:00', '2027-03-28 08:00'),
    ])

    expect(resultats[0]).toMatchObject({ dureeDeclareeMin: 780, montantCentimes: 2600 })
    expect(resultats[1]).toMatchObject({ dureeDeclareeMin: 660, montantCentimes: 2200 })
  })

  describe('astreintes contiguës et chevauchement (D-010)', () => {
    it('deux astreintes contiguës : ok toutes les deux, sans déduction mutuelle', () => {
      const resultats = calculer([
        activite('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
        activite('a2', 'astreinte', '2026-06-26 12:00', '2026-06-26 18:00'),
      ])

      expect(resultats[0]).toMatchObject({
        dureeDeclareeMin: 240,
        dureeDeduiteMin: 0,
        dureeNetteMin: 240,
        montantCentimes: 800,
        statut: 'ok',
      })
      expect(resultats[1]).toMatchObject({
        dureeDeclareeMin: 360,
        dureeDeduiteMin: 0,
        dureeNetteMin: 360,
        montantCentimes: 1200,
        statut: 'ok',
      })
      expect(totaliser(resultats).anomalies.chevauchement_astreintes).toBe(0)
    })

    it('deux astreintes qui se chevauchent : en anomalie et exclues des totaux, sans effet sur les autres activités', () => {
      const resultats = calculer([
        activite('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
        activite('a2', 'astreinte', '2026-06-26 10:00', '2026-06-26 14:00'),
        activite('i1', 'intervention', '2026-06-26 09:00', '2026-06-26 09:30'),
        activite('a3', 'astreinte', '2026-06-27 08:00', '2026-06-27 12:00'),
      ])

      // Les durées et le taux restent calculés, le montant ne l'est pas (D-011).
      expect(resultats[0]).toEqual({
        id: 'a1',
        natureId: 'astreinte',
        estAstreinte: true,
        dureeDeclareeMin: 240,
        dureeDeduiteMin: 30,
        dureeNetteMin: 210,
        centimesParHeure: 200,
        montantCentimes: null,
        statut: 'chevauchement_astreintes',
      })
      expect(resultats[1]).toMatchObject({
        dureeDeclareeMin: 240,
        dureeDeduiteMin: 0,
        dureeNetteMin: 240,
        centimesParHeure: 200,
        montantCentimes: null,
        statut: 'chevauchement_astreintes',
      })
      // Les autres activités ne sont pas affectées.
      expect(resultats[2]).toMatchObject({ dureeNetteMin: 30, montantCentimes: 600, statut: 'ok' })
      expect(resultats[3]).toMatchObject({ dureeNetteMin: 240, montantCentimes: 800, statut: 'ok' })

      expect(totaliser(resultats)).toEqual({
        montantCentimes: 1400,
        astreintes: { dureeDeclareeMin: 240, dureeDeduiteMin: 0, dureeNetteMin: 240 },
        parNature: [
          { natureId: 'intervention', nombre: 1, dureeRetenueMin: 30, montantCentimes: 600 },
          { natureId: 'astreinte', nombre: 1, dureeRetenueMin: 240, montantCentimes: 800 },
        ],
        nbOk: 2,
        anomalies: { taux_manquant: 0, chevauchement_astreintes: 2 },
      })
    })
  })

  describe('taux manquant (3.5, D-011)', () => {
    it('pas de taux pour le couple : statut taux_manquant, durées calculées, exclue des totaux', () => {
      const resultats = calculer([
        activite('m1', 'manoeuvre', '2026-06-26 14:00', '2026-06-26 16:00'),
        activite('i1', 'intervention', '2026-06-26 18:00', '2026-06-26 19:00'),
      ])

      expect(resultats[0]).toEqual({
        id: 'm1',
        natureId: 'manoeuvre',
        estAstreinte: false,
        dureeDeclareeMin: 120,
        dureeDeduiteMin: 0,
        dureeNetteMin: 120,
        centimesParHeure: null,
        montantCentimes: null,
        statut: 'taux_manquant',
      })
      expect(totaliser(resultats)).toEqual({
        montantCentimes: 1200,
        astreintes: { dureeDeclareeMin: 0, dureeDeduiteMin: 0, dureeNetteMin: 0 },
        parNature: [{ natureId: 'intervention', nombre: 1, dureeRetenueMin: 60, montantCentimes: 1200 }],
        nbOk: 1,
        anomalies: { taux_manquant: 1, chevauchement_astreintes: 0 },
      })
    })

    it("pas de grade à la date de l'activité : statut taux_manquant, durées calculées", () => {
      const resultats = calculer([
        activite('a1', 'astreinte', '2024-06-26 08:00', '2024-06-26 12:00'),
        activite('i1', 'intervention', '2024-06-26 08:00', '2024-06-26 08:45'),
      ])

      expect(resultats[0]).toMatchObject({
        dureeDeclareeMin: 240,
        dureeDeduiteMin: 45,
        dureeNetteMin: 195,
        centimesParHeure: null,
        montantCentimes: null,
        statut: 'taux_manquant',
      })
      expect(resultats[1]).toMatchObject({ dureeNetteMin: 45, statut: 'taux_manquant' })
      expect(totaliser(resultats)).toMatchObject({
        montantCentimes: 0,
        nbOk: 0,
        anomalies: { taux_manquant: 2, chevauchement_astreintes: 0 },
      })
    })

    it("une activité en taux manquant est quand même déduite de l'astreinte", () => {
      const resultats = calculer([
        activite('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
        activite('m1', 'manoeuvre', '2026-06-26 09:00', '2026-06-26 10:00'),
      ])

      expect(resultats[0]).toMatchObject({
        dureeDeduiteMin: 60,
        dureeNetteMin: 180,
        montantCentimes: 600,
        statut: 'ok',
      })
      expect(resultats[1]).toMatchObject({ statut: 'taux_manquant', montantCentimes: null })
    })

    it("une astreinte en chevauchement et sans taux a le statut chevauchement_astreintes", () => {
      // En 2024, aucun grade n'est en vigueur : les deux anomalies se cumulent.
      const resultats = calculer([
        activite('a1', 'astreinte', '2024-06-26 08:00', '2024-06-26 12:00'),
        activite('a2', 'astreinte', '2024-06-26 11:00', '2024-06-26 15:00'),
      ])

      expect(resultats[0]).toMatchObject({
        centimesParHeure: null,
        montantCentimes: null,
        statut: 'chevauchement_astreintes',
      })
      expect(totaliser(resultats).anomalies).toEqual({
        taux_manquant: 0,
        chevauchement_astreintes: 2,
      })
    })
  })

  describe('conventions techniques (D-012)', () => {
    it('tronque le début et la fin à la minute : déclarée = déduite + nette', () => {
      const resultats = calculerActivites(
        [
          {
            id: 'a1',
            natureId: 'astreinte',
            debut: new Date('2026-06-26T06:00:40.500Z'),
            fin: new Date('2026-06-26T10:00:59.999Z'),
          },
          {
            id: 'i1',
            natureId: 'intervention',
            debut: new Date('2026-06-26T06:00:10Z'),
            fin: new Date('2026-06-26T06:45:50Z'),
          },
        ],
        natures,
        historiqueGrades,
        taux,
      )

      expect(resultats[0]).toMatchObject({
        dureeDeclareeMin: 240,
        dureeDeduiteMin: 45,
        dureeNetteMin: 195,
      })
      expect(resultats[1]).toMatchObject({ dureeDeclareeMin: 45 })
    })

    it('refuse une fin antérieure ou égale au début', () => {
      expect(() =>
        calculer([activite('x', 'intervention', '2026-06-26 10:00', '2026-06-26 09:00')]),
      ).toThrow('Activité x : la fin doit être postérieure au début.')
      expect(() =>
        calculer([activite('y', 'intervention', '2026-06-26 10:00', '2026-06-26 10:00')]),
      ).toThrow('Activité y')
    })

    it('refuse une nature inconnue', () => {
      expect(() =>
        calculer([activite('x', 'inconnue', '2026-06-26 10:00', '2026-06-26 11:00')]),
      ).toThrow('Activité x : nature inconnue (inconnue).')
    })

    it('refuse une date invalide', () => {
      expect(() =>
        calculer([
          { id: 'x', natureId: 'intervention', debut: new Date('pas une date'), fin: new Date() },
        ]),
      ).toThrow('Activité x : date de début ou de fin invalide.')
    })

    it('ne modifie pas les données reçues', () => {
      const activites = [
        activite('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
        activite('i1', 'intervention', '2026-06-26 08:00', '2026-06-26 08:45'),
      ]
      const copie = structuredClone(activites)

      calculer(activites)

      expect(activites).toEqual(copie)
    })
  })
})

describe('totaliser', () => {
  it('renvoie des totaux à zéro pour une liste vide', () => {
    expect(totaliser([])).toEqual({
      montantCentimes: 0,
      astreintes: { dureeDeclareeMin: 0, dureeDeduiteMin: 0, dureeNetteMin: 0 },
      parNature: [],
      nbOk: 0,
      anomalies: { taux_manquant: 0, chevauchement_astreintes: 0 },
    })
  })

  it('regroupe par nature et totalise les astreintes à part', () => {
    const resultats = calculer([
      activite('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
      activite('i1', 'intervention', '2026-06-26 08:00', '2026-06-26 08:45'),
      activite('a2', 'astreinte', '2026-06-27 20:00', '2026-06-28 08:00'),
      activite('i2', 'intervention', '2026-06-27 22:00', '2026-06-27 23:30'),
      activite('i3', 'intervention', '2026-06-29 10:00', '2026-06-29 10:07'),
    ])

    expect(totaliser(resultats)).toEqual({
      // 650 + 900 + 2100 (630 min à 2,00 €/h) + 1800 + 140 (7 min à 12,00 €/h)
      montantCentimes: 5590,
      astreintes: { dureeDeclareeMin: 960, dureeDeduiteMin: 135, dureeNetteMin: 825 },
      parNature: [
        { natureId: 'astreinte', nombre: 2, dureeRetenueMin: 825, montantCentimes: 2750 },
        { natureId: 'intervention', nombre: 3, dureeRetenueMin: 142, montantCentimes: 2840 },
      ],
      nbOk: 5,
      anomalies: { taux_manquant: 0, chevauchement_astreintes: 0 },
    })
  })
})
