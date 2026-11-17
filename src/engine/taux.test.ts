import { describe, expect, it } from 'vitest'
import { paris } from './aides-test'
import {
  dateParis,
  estDateEffetPassee,
  gradeEnVigueur,
  ligneEnVigueur,
  prochaineLigne,
  resoudreTaux,
  statutLigne,
  tauxDuCouple,
  tauxEnVigueur,
} from './taux'
import type { HistoriqueGrade, Taux } from './types'

// Tous les taux de ce fichier sont fictifs.

describe('dateParis', () => {
  it("donne la date calendaire de Paris, en été comme en hiver", () => {
    expect(dateParis(paris('2026-06-26 08:00'))).toBe('2026-06-26')
    expect(dateParis(paris('2026-01-15 12:00'))).toBe('2026-01-15')
  })

  it('le 31/12 à 23:30 à Paris (22:30 UTC) reste le 31/12', () => {
    const instant = paris('2026-12-31 23:30')

    expect(instant.toISOString()).toBe('2026-12-31T22:30:00.000Z')
    expect(dateParis(instant)).toBe('2026-12-31')
  })

  it('le 01/01 à 00:30 à Paris est le 01/01, alors que la date UTC est encore le 31/12', () => {
    const instant = paris('2027-01-01 00:30')

    expect(instant.toISOString()).toBe('2026-12-31T23:30:00.000Z')
    expect(dateParis(instant)).toBe('2027-01-01')
  })

  it("en été, 01:30 à Paris est la veille en UTC mais bien le jour même à Paris", () => {
    const instant = paris('2026-07-01 01:30')

    expect(instant.toISOString()).toBe('2026-06-30T23:30:00.000Z')
    expect(dateParis(instant)).toBe('2026-07-01')
  })
})

describe('gradeEnVigueur', () => {
  const historique: HistoriqueGrade[] = [
    { gradeId: 'caporal', dateEffet: '2026-07-01' },
    { gradeId: 'sapeur', dateEffet: '2025-01-01' },
  ]

  it("renvoie null avant la première date d'effet", () => {
    expect(gradeEnVigueur(historique, '2024-12-31')).toBeNull()
  })

  it("renvoie le grade dont la date d'effet est la plus récente avant la date", () => {
    expect(gradeEnVigueur(historique, '2025-01-01')).toBe('sapeur')
    expect(gradeEnVigueur(historique, '2026-06-30')).toBe('sapeur')
  })

  it("applique le nouveau grade dès le jour de sa date d'effet", () => {
    expect(gradeEnVigueur(historique, '2026-07-01')).toBe('caporal')
    expect(gradeEnVigueur(historique, '2030-01-01')).toBe('caporal')
  })

  it('renvoie null pour un historique vide', () => {
    expect(gradeEnVigueur([], '2026-06-26')).toBeNull()
  })
})

describe('tauxEnVigueur', () => {
  const taux: Taux[] = [
    { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1300, dateEffet: '2027-01-01' },
    { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1200, dateEffet: '2026-01-01' },
    { gradeId: 'sapeur', natureId: 'astreinte', centimesParHeure: 200, dateEffet: '2026-01-01' },
    { gradeId: 'caporal', natureId: 'intervention', centimesParHeure: 1400, dateEffet: '2026-01-01' },
  ]

  it('choisit la ligne du bon couple (grade, nature)', () => {
    expect(tauxEnVigueur(taux, 'sapeur', 'astreinte', '2026-06-26')).toBe(200)
    expect(tauxEnVigueur(taux, 'caporal', 'intervention', '2026-06-26')).toBe(1400)
  })

  it("garde l'ancien taux jusqu'à la veille de la nouvelle date d'effet", () => {
    expect(tauxEnVigueur(taux, 'sapeur', 'intervention', '2026-12-31')).toBe(1200)
  })

  it("applique le nouveau taux dès le jour de sa date d'effet", () => {
    expect(tauxEnVigueur(taux, 'sapeur', 'intervention', '2027-01-01')).toBe(1300)
  })

  it("renvoie null sans taux pour le couple, ou avant la première date d'effet", () => {
    expect(tauxEnVigueur(taux, 'caporal', 'astreinte', '2026-06-26')).toBeNull()
    expect(tauxEnVigueur(taux, 'sapeur', 'intervention', '2025-12-31')).toBeNull()
  })
})

describe('resoudreTaux (cahier des charges 3.5)', () => {
  const historique: HistoriqueGrade[] = [{ gradeId: 'sapeur', dateEffet: '2025-01-01' }]
  const taux: Taux[] = [
    { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1200, dateEffet: '2026-01-01' },
    { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1300, dateEffet: '2027-01-01' },
  ]

  it("une activité antérieure à la nouvelle date d'effet garde l'ancien taux", () => {
    expect(resoudreTaux(paris('2026-12-15 10:00'), 'intervention', historique, taux)).toBe(1200)
  })

  it("une activité qui commence le jour de la date d'effet prend le nouveau taux", () => {
    expect(resoudreTaux(paris('2027-01-01 10:00'), 'intervention', historique, taux)).toBe(1300)
  })

  it("frontière de fuseau : début le 31/12 à 23:30 (Paris) → ancien taux", () => {
    expect(resoudreTaux(paris('2026-12-31 23:30'), 'intervention', historique, taux)).toBe(1200)
  })

  it("frontière de fuseau, cas miroir : début le 01/01 à 00:30 (Paris, 31/12 à 23:30 UTC) → nouveau taux", () => {
    expect(resoudreTaux(paris('2027-01-01 00:30'), 'intervention', historique, taux)).toBe(1300)
  })

  describe('changement de grade au 01/01/2027', () => {
    const historiqueAvecPromotion: HistoriqueGrade[] = [
      { gradeId: 'sapeur', dateEffet: '2025-01-01' },
      { gradeId: 'caporal', dateEffet: '2027-01-01' },
    ]
    const tauxParGrade: Taux[] = [
      { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1200, dateEffet: '2025-01-01' },
      { gradeId: 'caporal', natureId: 'intervention', centimesParHeure: 1400, dateEffet: '2025-01-01' },
    ]

    it('début le 31/12 à 23:30 (Paris) → ancien grade', () => {
      expect(
        resoudreTaux(paris('2026-12-31 23:30'), 'intervention', historiqueAvecPromotion, tauxParGrade),
      ).toBe(1200)
    })

    it('début le 01/01 à 00:30 (Paris, 31/12 à 23:30 UTC) → nouveau grade', () => {
      expect(
        resoudreTaux(paris('2027-01-01 00:30'), 'intervention', historiqueAvecPromotion, tauxParGrade),
      ).toBe(1400)
    })
  })

  it('renvoie null sans taux pour le couple (grade, nature)', () => {
    expect(resoudreTaux(paris('2026-06-26 08:00'), 'astreinte', historique, taux)).toBeNull()
  })

  it("renvoie null sans grade en vigueur à la date de l'activité", () => {
    expect(resoudreTaux(paris('2024-06-26 08:00'), 'intervention', historique, taux)).toBeNull()
    expect(resoudreTaux(paris('2026-06-26 08:00'), 'intervention', [], taux)).toBeNull()
  })
})

describe('ligneEnVigueur et prochaineLigne', () => {
  // Ordre volontairement mélangé : le résultat ne dépend pas de l'ordre reçu.
  const lignes = [
    { id: 'b', dateEffet: '2026-07-01' },
    { id: 'c', dateEffet: '2027-07-01' },
    { id: 'a', dateEffet: '2026-01-01' },
    { id: 'd', dateEffet: '2028-01-01' },
  ]

  it('renvoie la ligne en vigueur, objet reçu compris (pour afficher sa date d’effet)', () => {
    expect(ligneEnVigueur(lignes, '2026-06-30')).toBe(lignes[2])
    expect(ligneEnVigueur(lignes, '2026-07-01')?.id).toBe('b')
    expect(ligneEnVigueur(lignes, '2027-12-31')?.id).toBe('c')
  })

  it('renvoie null avant la première date d’effet, ou pour une liste vide', () => {
    expect(ligneEnVigueur(lignes, '2025-12-31')).toBeNull()
    expect(ligneEnVigueur([], '2026-06-30')).toBeNull()
  })

  it('renvoie la prochaine ligne strictement future, la plus proche', () => {
    expect(prochaineLigne(lignes, '2026-06-30')?.id).toBe('b')
    expect(prochaineLigne(lignes, '2026-07-01')?.id).toBe('c')
    expect(prochaineLigne(lignes, '2025-01-01')?.id).toBe('a')
  })

  it('renvoie null quand aucune ligne n’est future', () => {
    expect(prochaineLigne(lignes, '2028-01-01')).toBeNull()
    expect(prochaineLigne([], '2026-06-30')).toBeNull()
  })
})

describe('statutLigne', () => {
  const lignes = [{ dateEffet: '2025-01-01' }, { dateEffet: '2026-07-01' }, { dateEffet: '2027-01-01' }]
  const aujourdhui = '2026-11-17'

  it('marque « en vigueur » la seule ligne retenue à la date', () => {
    expect(statutLigne(lignes, lignes[1], aujourdhui)).toBe('en_vigueur')
  })

  it('marque « passé » une ligne antérieure remplacée depuis', () => {
    expect(statutLigne(lignes, lignes[0], aujourdhui)).toBe('passe')
  })

  it('marque « à venir » une ligne future', () => {
    expect(statutLigne(lignes, lignes[2], aujourdhui)).toBe('a_venir')
  })

  it('une ligne datée du jour même est « en vigueur »', () => {
    expect(statutLigne(lignes, lignes[1], '2026-07-01')).toBe('en_vigueur')
    expect(statutLigne(lignes, lignes[0], '2026-07-01')).toBe('passe')
  })

  it('sans ligne en vigueur, toutes les lignes sont « à venir »', () => {
    expect(lignes.map((ligne) => statutLigne(lignes, ligne, '2024-12-31'))).toEqual([
      'a_venir',
      'a_venir',
      'a_venir',
    ])
  })
})

describe('estDateEffetPassee', () => {
  it('la date du jour à Paris est passée ; le lendemain est futur', () => {
    const maintenant = paris('2026-11-17 10:00')

    expect(estDateEffetPassee('2026-11-16', maintenant)).toBe(true)
    expect(estDateEffetPassee('2026-11-17', maintenant)).toBe(true)
    expect(estDateEffetPassee('2026-11-18', maintenant)).toBe(false)
  })

  it('se fonde sur la date de Paris, pas sur la date UTC', () => {
    // 01/01/2027 à 00:30 à Paris = 31/12/2026 à 23:30 UTC.
    const maintenant = paris('2027-01-01 00:30')

    expect(estDateEffetPassee('2027-01-01', maintenant)).toBe(true)
  })
})

describe('tauxDuCouple', () => {
  it('ne garde que les taux du couple (grade, nature), objets reçus compris', () => {
    const taux = [
      { gradeId: 'sapeur', natureId: 'astreinte', centimesParHeure: 200, dateEffet: '2026-01-01', id: 't1' },
      { gradeId: 'sapeur', natureId: 'intervention', centimesParHeure: 1200, dateEffet: '2026-01-01', id: 't2' },
      { gradeId: 'caporal', natureId: 'astreinte', centimesParHeure: 300, dateEffet: '2026-01-01', id: 't3' },
      { gradeId: 'sapeur', natureId: 'astreinte', centimesParHeure: 250, dateEffet: '2027-01-01', id: 't4' },
    ]

    expect(tauxDuCouple(taux, 'sapeur', 'astreinte').map((ligne) => ligne.id)).toEqual(['t1', 't4'])
  })
})
