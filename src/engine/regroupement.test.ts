import { describe, expect, it } from 'vitest'
import { paris } from './aides-test'
import { calculerActivites, calculerActivitesDetaillees, totaliser } from './index'
import type { ActiviteEntree, HistoriqueGrade, Nature, Taux } from './index'
import {
  joursDeLaSemaine,
  moisDeLAnnee,
  moisGlissants,
  periodeJour,
  periodeMois,
  periodeSemaine,
} from './periodes'
import {
  CATEGORIES,
  categorieDe,
  ecart,
  historiqueMensuel,
  regrouper,
  totaliserPeriode,
} from './regroupement'

// Référentiel de test. Tous les taux sont fictifs.
const natures: Nature[] = [
  { id: 'astreinte', estAstreinte: true, estIntervention: false },
  { id: 'vsav', estAstreinte: false, estIntervention: true },
  { id: 'fpt', estAstreinte: false, estIntervention: true },
  { id: 'garde', estAstreinte: false, estIntervention: false },
  { id: 'reunion', estAstreinte: false, estIntervention: false }, // sans taux
]
const historique: HistoriqueGrade[] = [{ gradeId: 'sapeur', dateEffet: '2025-01-01' }]
const taux: Taux[] = [
  { gradeId: 'sapeur', natureId: 'astreinte', centimesParHeure: 200, dateEffet: '2025-01-01' },
  { gradeId: 'sapeur', natureId: 'vsav', centimesParHeure: 1200, dateEffet: '2025-01-01' },
  { gradeId: 'sapeur', natureId: 'fpt', centimesParHeure: 1200, dateEffet: '2025-01-01' },
  { gradeId: 'sapeur', natureId: 'garde', centimesParHeure: 1000, dateEffet: '2025-01-01' },
]

function activite(id: string, natureId: string, debut: string, fin: string): ActiviteEntree {
  return { id, natureId, debut: paris(debut), fin: paris(fin) }
}

function detailler(activites: ActiviteEntree[], grades: HistoriqueGrade[] = historique) {
  return calculerActivitesDetaillees(activites, natures, grades, taux)
}

describe('calculerActivitesDetaillees', () => {
  const activites = [
    activite('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
    activite('i1', 'vsav', '2026-06-26 09:00', '2026-06-26 09:45'),
  ]

  it('donne exactement les résultats de calculerActivites', () => {
    expect(detailler(activites).map(({ resultat }) => resultat)).toEqual(
      calculerActivites(activites, natures, historique, taux),
    )
  })

  it('expose les plages déclarée, déduites et nettes d’une astreinte', () => {
    const [astreinte, intervention] = detailler(activites)
    expect(astreinte.plages).toEqual({
      declaree: { debut: paris('2026-06-26 08:00').getTime(), fin: paris('2026-06-26 12:00').getTime() },
      deduites: [{ debut: paris('2026-06-26 09:00').getTime(), fin: paris('2026-06-26 09:45').getTime() }],
      nettes: [
        { debut: paris('2026-06-26 08:00').getTime(), fin: paris('2026-06-26 09:00').getTime() },
        { debut: paris('2026-06-26 09:45').getTime(), fin: paris('2026-06-26 12:00').getTime() },
      ],
    })
    // Hors astreinte : rien de déduit, la plage déclarée est nette.
    expect(intervention.plages.deduites).toEqual([])
    expect(intervention.plages.nettes).toEqual([intervention.plages.declaree])
  })
})

describe('categorieDe', () => {
  it('astreinte, intervention ou autre activité', () => {
    expect(natures.map(categorieDe)).toEqual([
      'astreinte',
      'intervention',
      'intervention',
      'autre',
      'autre',
    ])
    expect(CATEGORIES).toEqual(['astreinte', 'intervention', 'autre'])
  })
})

describe('ventilation des durées d’astreinte (D-033)', () => {
  it('astreinte dimanche 18 h → lundi 8 h sans activité : 6 h + 8 h, « à cheval » sur deux semaines', () => {
    const activites = detailler([activite('a1', 'astreinte', '2026-11-15 18:00', '2026-11-16 08:00')])
    const [w46, w47] = regrouper(activites, natures, [
      periodeSemaine('2026-W46'),
      periodeSemaine('2026-W47'),
    ])

    expect(w46.astreintes).toMatchObject({ dureeDeclareeMin: 360, dureeDeduiteMin: 0, dureeNetteMin: 360 })
    expect(w47.astreintes).toMatchObject({ dureeDeclareeMin: 480, dureeDeduiteMin: 0, dureeNetteMin: 480 })
    expect(w46.aCheval).toEqual(['a1'])
    expect(w47.aCheval).toEqual(['a1'])
  })

  it('avec une intervention de 23 h à 1 h : nette 5 h + 7 h, déduite 1 h + 1 h', () => {
    const activites = detailler([
      activite('a1', 'astreinte', '2026-11-15 18:00', '2026-11-16 08:00'),
      activite('i1', 'vsav', '2026-11-15 23:00', '2026-11-16 01:00'),
    ])
    const [w46, w47] = regrouper(activites, natures, [
      periodeSemaine('2026-W46'),
      periodeSemaine('2026-W47'),
    ])

    expect(w46.astreintes).toMatchObject({ dureeDeclareeMin: 360, dureeDeduiteMin: 60, dureeNetteMin: 300 })
    expect(w47.astreintes).toMatchObject({ dureeDeclareeMin: 480, dureeDeduiteMin: 60, dureeNetteMin: 420 })
    // La somme des parts redonne les durées de l'activité.
    const resultat = activites[0].resultat
    expect(w46.astreintes.dureeNetteMin + w47.astreintes.dureeNetteMin).toBe(resultat.dureeNetteMin)
  })

  it('astreinte à cheval sur deux mois : chaque mois reçoit ses heures', () => {
    const activites = detailler([activite('a1', 'astreinte', '2026-10-31 18:00', '2026-11-01 08:00')])
    const [octobre, novembre] = regrouper(activites, natures, [
      periodeMois('2026-10'),
      periodeMois('2026-11'),
    ])

    expect(octobre.astreintes.dureeNetteMin).toBe(360)
    expect(novembre.astreintes.dureeNetteMin).toBe(480)
    expect(octobre.aCheval).toEqual(['a1'])
    expect(novembre.aCheval).toEqual(['a1'])
  })

  it('nuit du passage à l’heure d’hiver : 15 h réelles, réparties 6 h + 9 h entre les deux jours', () => {
    const activites = detailler([activite('a1', 'astreinte', '2026-10-24 18:00', '2026-10-25 08:00')])
    const [samedi, dimanche] = regrouper(activites, natures, [
      periodeJour('2026-10-24'),
      periodeJour('2026-10-25'),
    ])

    expect(activites[0].resultat.dureeNetteMin).toBe(15 * 60)
    expect(samedi.astreintes.dureeNetteMin).toBe(6 * 60)
    expect(dimanche.astreintes.dureeNetteMin).toBe(9 * 60)
  })

  it('une astreinte comprise dans la période n’est pas « à cheval »', () => {
    const activites = detailler([activite('a1', 'astreinte', '2026-11-17 08:00', '2026-11-17 12:00')])
    expect(totaliserPeriode(activites, natures, periodeSemaine('2026-W47')).aCheval).toEqual([])
  })

  it('les jours d’une semaine se partagent exactement les durées de la semaine', () => {
    const activites = detailler([
      activite('a1', 'astreinte', '2026-11-17 18:00', '2026-11-18 08:00'),
      activite('a2', 'astreinte', '2026-11-21 08:00', '2026-11-22 08:00'),
      activite('i1', 'vsav', '2026-11-21 14:00', '2026-11-21 15:30'),
    ])
    const semaine = totaliserPeriode(activites, natures, periodeSemaine('2026-W47'))
    const jours = regrouper(activites, natures, joursDeLaSemaine('2026-W47'))
    const somme = (cle: 'dureeDeclareeMin' | 'dureeDeduiteMin' | 'dureeNetteMin') =>
      jours.reduce((total, jour) => total + jour.astreintes[cle], 0)

    expect(somme('dureeDeclareeMin')).toBe(semaine.astreintes.dureeDeclareeMin)
    expect(somme('dureeDeduiteMin')).toBe(semaine.astreintes.dureeDeduiteMin)
    expect(somme('dureeNetteMin')).toBe(semaine.astreintes.dureeNetteMin)
  })
})

describe('rattachement à la période de début (D-033)', () => {
  it('le montant d’une astreinte à cheval va entièrement à la période de début', () => {
    const activites = detailler([activite('a1', 'astreinte', '2026-11-15 18:00', '2026-11-16 08:00')])
    const [w46, w47] = regrouper(activites, natures, [
      periodeSemaine('2026-W46'),
      periodeSemaine('2026-W47'),
    ])

    // 14 h à 2,00 €/h (taux fictif).
    expect(w46.montants.totalCentimes).toBe(2800)
    expect(w47.montants.totalCentimes).toBe(0)
    expect(w46.activites).toEqual(['a1'])
    expect(w47.activites).toEqual([])
  })

  it('une activité qui n’est pas une astreinte est comptée entière dans la période de son début', () => {
    const activites = detailler([activite('g1', 'garde', '2026-11-15 23:00', '2026-11-16 01:00')])
    const [w46, w47] = regrouper(activites, natures, [
      periodeSemaine('2026-W46'),
      periodeSemaine('2026-W47'),
    ])

    expect(w46.montants.parCategorie.autre).toEqual({
      montantCentimes: 2000,
      nombre: 1,
      parNature: [{ natureId: 'garde', montantCentimes: 2000, nombre: 1 }],
    })
    expect(w47.montants.totalCentimes).toBe(0)
    expect(w47.activites).toEqual([])
  })
})

describe('totaux d’une période', () => {
  // Semaine 47 de 2026 : une astreinte, trois interventions, une garde, une réunion sans taux.
  const activites = detailler([
    activite('a1', 'astreinte', '2026-11-17 18:00', '2026-11-18 08:00'),
    activite('i1', 'vsav', '2026-11-17 23:00', '2026-11-18 00:30'),
    activite('i2', 'vsav', '2026-11-19 10:00', '2026-11-19 11:00'),
    activite('i3', 'fpt', '2026-11-20 10:00', '2026-11-20 12:00'),
    activite('g1', 'garde', '2026-11-21 08:00', '2026-11-21 10:00'),
    activite('r1', 'reunion', '2026-11-21 14:00', '2026-11-21 15:00'),
  ])
  const totaux = totaliserPeriode(activites, natures, periodeSemaine('2026-W47'))

  it('montants par catégorie puis par nature, activités « ok » seulement (D-011)', () => {
    // Astreinte : 14 h − 1 h 30 = 12 h 30 à 2,00 € = 25,00 € ; interventions :
    // 1 h 30 + 1 h à 12,00 € et 2 h à 12,00 € ; garde : 2 h à 10,00 €.
    expect(totaux.montants).toEqual({
      totalCentimes: 2500 + 1800 + 1200 + 2400 + 2000,
      parCategorie: {
        astreinte: {
          montantCentimes: 2500,
          nombre: 1,
          parNature: [{ natureId: 'astreinte', montantCentimes: 2500, nombre: 1 }],
        },
        intervention: {
          montantCentimes: 5400,
          nombre: 3,
          parNature: [
            { natureId: 'vsav', montantCentimes: 3000, nombre: 2 },
            { natureId: 'fpt', montantCentimes: 2400, nombre: 1 },
          ],
        },
        autre: {
          montantCentimes: 2000,
          nombre: 1,
          parNature: [{ natureId: 'garde', montantCentimes: 2000, nombre: 1 }],
        },
      },
    })
  })

  it('durées d’astreinte, avec le détail par nature', () => {
    expect(totaux.astreintes).toEqual({
      dureeDeclareeMin: 840,
      dureeDeduiteMin: 90,
      dureeNetteMin: 750,
      parNature: [{ natureId: 'astreinte', dureeDeclareeMin: 840, dureeDeduiteMin: 90, dureeNetteMin: 750 }],
    })
  })

  it('interventions par nature, anomalies et activités de la période', () => {
    expect(totaux.interventions).toEqual({
      nombre: 3,
      enAnomalie: 0,
      parNature: [
        { natureId: 'vsav', nombre: 2, enAnomalie: 0 },
        { natureId: 'fpt', nombre: 1, enAnomalie: 0 },
      ],
    })
    // La réunion n'a pas de taux : anomalie, montant exclu.
    expect(totaux.anomalies).toEqual({ taux_manquant: 1, chevauchement_astreintes: 0 })
    expect(totaux.activites).toEqual(['a1', 'i1', 'i2', 'i3', 'g1', 'r1'])
  })

  it('période vide : tout à zéro', () => {
    const vide = totaliserPeriode(activites, natures, periodeSemaine('2026-W40'))
    expect(vide.montants.totalCentimes).toBe(0)
    expect(vide.astreintes.dureeNetteMin).toBe(0)
    expect(vide.interventions).toEqual({ nombre: 0, enAnomalie: 0, parNature: [] })
    expect(vide.activites).toEqual([])
  })
})

describe('anomalies : D-011, D-034, D-035', () => {
  // En 2024, aucun grade n'est en vigueur : tout est en « taux manquant ».
  const sansGrade = detailler([
    activite('a1', 'astreinte', '2024-11-12 18:00', '2024-11-13 08:00'),
    activite('i1', 'vsav', '2024-11-12 23:00', '2024-11-13 00:00'),
  ])
  const semaine = totaliserPeriode(sansGrade, natures, periodeSemaine('2024-W46'))

  it('D-035 : une astreinte en « taux manquant » compte dans les durées', () => {
    expect(semaine.astreintes).toMatchObject({ dureeDeclareeMin: 840, dureeDeduiteMin: 60, dureeNetteMin: 780 })
  })

  it('D-034 : une intervention en « taux manquant » compte dans le nombre d’interventions', () => {
    expect(semaine.interventions).toEqual({
      nombre: 1,
      enAnomalie: 1,
      parNature: [{ natureId: 'vsav', nombre: 1, enAnomalie: 1 }],
    })
  })

  it('D-011 : leurs montants restent exclus', () => {
    expect(semaine.montants.totalCentimes).toBe(0)
    expect(semaine.anomalies).toEqual({ taux_manquant: 2, chevauchement_astreintes: 0 })
  })

  it('une astreinte en « chevauchement d’astreintes » est exclue des durées et des montants', () => {
    const chevauchement = detailler([
      activite('a1', 'astreinte', '2026-11-17 08:00', '2026-11-17 12:00'),
      activite('a2', 'astreinte', '2026-11-17 10:00', '2026-11-17 14:00'),
      activite('a3', 'astreinte', '2026-11-18 08:00', '2026-11-18 10:00'),
    ])
    const totaux = totaliserPeriode(chevauchement, natures, periodeSemaine('2026-W47'))

    expect(totaux.astreintes.dureeNetteMin).toBe(120)
    expect(totaux.montants.totalCentimes).toBe(400)
    expect(totaux.anomalies).toEqual({ taux_manquant: 0, chevauchement_astreintes: 2 })
    expect(totaux.aCheval).toEqual([])
  })
})

describe('totaliser (liste des activités) aligné sur D-034 et D-035', () => {
  it('compte les durées des astreintes en « taux manquant » et les interventions en anomalie', () => {
    const resultats = calculerActivites(
      [
        activite('a1', 'astreinte', '2024-11-12 18:00', '2024-11-13 08:00'),
        activite('i1', 'vsav', '2024-11-12 23:00', '2024-11-13 00:00'),
      ],
      natures,
      historique,
      taux,
    )
    expect(totaliser(resultats, natures)).toMatchObject({
      montantCentimes: 0,
      astreintes: { dureeDeclareeMin: 840, dureeDeduiteMin: 60, dureeNetteMin: 780 },
      nbOk: 0,
      interventions: { nombre: 1, enAnomalie: 1 },
      anomalies: { taux_manquant: 2, chevauchement_astreintes: 0 },
    })
  })
})

describe('ecart avec la période précédente', () => {
  it('« +42,50 € (+8 %) »', () => {
    expect(ecart(57500, 53250)).toEqual({ centimes: 4250, pourcentage: 8 })
  })

  it('arrondi à l’unité, le demi vers le haut', () => {
    expect(ecart(10050, 10000).pourcentage).toBe(1) // +0,5 %
    expect(ecart(10049, 10000).pourcentage).toBe(0) // +0,49 %
    expect(ecart(9950, 10000).pourcentage).toBe(0) // −0,5 % → 0
    expect(ecart(9949, 10000).pourcentage).toBe(-1) // −0,51 %
    expect(ecart(0, 10000)).toEqual({ centimes: -10000, pourcentage: -100 })
  })

  it('pourcentage absent si la période précédente vaut 0 €', () => {
    expect(ecart(1500, 0)).toEqual({ centimes: 1500, pourcentage: null })
    expect(ecart(0, 0)).toEqual({ centimes: 0, pourcentage: null })
  })
})

describe('historiqueMensuel', () => {
  const activites = detailler([
    activite('g1', 'garde', '2026-01-10 08:00', '2026-01-10 10:00'),
    activite('g2', 'garde', '2026-11-10 08:00', '2026-11-10 09:00'),
    activite('g3', 'garde', '2025-12-31 23:00', '2026-01-01 01:00'),
  ])

  it('12 mois glissants : un total par mois, du plus ancien au plus récent', () => {
    const historique12 = historiqueMensuel(activites, natures, moisGlissants('2026-11'), '2026-11')
    expect(historique12).toHaveLength(12)
    expect(historique12.map((mois) => mois?.montants.totalCentimes)).toEqual([
      2000, 2000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1000,
    ])
    expect(historique12[0]?.periode.cle).toBe('2025-12')
  })

  it('année civile : les mois futurs sont à vide', () => {
    const annee = historiqueMensuel(activites, natures, moisDeLAnnee(2026), '2026-11')
    expect(annee.map((mois) => mois?.montants.totalCentimes ?? null)).toEqual([
      2000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1000, null,
    ])
  })
})
