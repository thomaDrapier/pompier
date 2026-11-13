import { describe, expect, it } from 'vitest'
import { duree, intersection, seChevauchent, soustraire, union } from './intervalles'

// Dans ces tests, les bornes sont de petits nombres : seule la logique des
// plages semi-ouvertes [debut, fin) est vérifiée, pas les dates.

describe('union', () => {
  it('garde séparées deux plages disjointes et les trie', () => {
    expect(
      union([
        { debut: 30, fin: 40 },
        { debut: 0, fin: 10 },
      ]),
    ).toEqual([
      { debut: 0, fin: 10 },
      { debut: 30, fin: 40 },
    ])
  })

  it('fusionne deux plages qui se chevauchent', () => {
    expect(
      union([
        { debut: 0, fin: 10 },
        { debut: 5, fin: 20 },
      ]),
    ).toEqual([{ debut: 0, fin: 20 }])
  })

  it('fusionne deux plages contiguës', () => {
    expect(
      union([
        { debut: 0, fin: 10 },
        { debut: 10, fin: 20 },
      ]),
    ).toEqual([{ debut: 0, fin: 20 }])
  })

  it('absorbe une plage contenue dans une autre', () => {
    expect(
      union([
        { debut: 0, fin: 100 },
        { debut: 20, fin: 30 },
        { debut: 90, fin: 120 },
      ]),
    ).toEqual([{ debut: 0, fin: 120 }])
  })

  it('ignore les plages vides et ne modifie pas la liste reçue', () => {
    const plages = [
      { debut: 5, fin: 5 },
      { debut: 0, fin: 10 },
      { debut: 5, fin: 20 },
    ]
    expect(union(plages)).toEqual([{ debut: 0, fin: 20 }])
    expect(plages[1]).toEqual({ debut: 0, fin: 10 })
  })

  it('renvoie une liste vide pour une liste vide', () => {
    expect(union([])).toEqual([])
  })
})

describe('intersection', () => {
  it('renvoie la partie commune de deux plages', () => {
    expect(intersection([{ debut: 0, fin: 10 }], [{ debut: 5, fin: 20 }])).toEqual([
      { debut: 5, fin: 10 },
    ])
  })

  it('renvoie une liste vide pour deux plages contiguës', () => {
    expect(intersection([{ debut: 0, fin: 10 }], [{ debut: 10, fin: 20 }])).toEqual([])
  })

  it('traite plusieurs plages de chaque côté', () => {
    expect(
      intersection(
        [
          { debut: 0, fin: 10 },
          { debut: 20, fin: 30 },
        ],
        [
          { debut: 5, fin: 25 },
          { debut: 28, fin: 40 },
        ],
      ),
    ).toEqual([
      { debut: 5, fin: 10 },
      { debut: 20, fin: 25 },
      { debut: 28, fin: 30 },
    ])
  })
})

describe('soustraire (A privé de B)', () => {
  it('renvoie A quand B est vide ou sans partie commune', () => {
    expect(soustraire([{ debut: 0, fin: 10 }], [])).toEqual([{ debut: 0, fin: 10 }])
    expect(soustraire([{ debut: 0, fin: 10 }], [{ debut: 10, fin: 20 }])).toEqual([
      { debut: 0, fin: 10 },
    ])
  })

  it('retire le début de A', () => {
    expect(soustraire([{ debut: 10, fin: 20 }], [{ debut: 5, fin: 12 }])).toEqual([
      { debut: 12, fin: 20 },
    ])
  })

  it('retire la fin de A', () => {
    expect(soustraire([{ debut: 10, fin: 20 }], [{ debut: 18, fin: 25 }])).toEqual([
      { debut: 10, fin: 18 },
    ])
  })

  it('coupe A en deux quand B est au milieu', () => {
    expect(soustraire([{ debut: 0, fin: 30 }], [{ debut: 10, fin: 20 }])).toEqual([
      { debut: 0, fin: 10 },
      { debut: 20, fin: 30 },
    ])
  })

  it('renvoie une liste vide quand B recouvre A', () => {
    expect(soustraire([{ debut: 10, fin: 20 }], [{ debut: 0, fin: 30 }])).toEqual([])
    expect(soustraire([{ debut: 10, fin: 20 }], [{ debut: 10, fin: 20 }])).toEqual([])
  })

  it('ne retire pas deux fois un créneau couvert par deux plages de B', () => {
    expect(
      soustraire(
        [{ debut: 0, fin: 100 }],
        [
          { debut: 10, fin: 30 },
          { debut: 20, fin: 40 },
        ],
      ),
    ).toEqual([
      { debut: 0, fin: 10 },
      { debut: 40, fin: 100 },
    ])
  })

  it('traite plusieurs plages de A avec une plage de B à cheval', () => {
    expect(
      soustraire(
        [
          { debut: 0, fin: 10 },
          { debut: 20, fin: 30 },
        ],
        [{ debut: 5, fin: 25 }],
      ),
    ).toEqual([
      { debut: 0, fin: 5 },
      { debut: 25, fin: 30 },
    ])
  })
})

describe('duree', () => {
  it('additionne les durées de plages disjointes', () => {
    expect(
      duree([
        { debut: 0, fin: 10 },
        { debut: 20, fin: 25 },
      ]),
    ).toBe(15)
  })

  it("ne compte qu'une fois un créneau couvert deux fois", () => {
    expect(
      duree([
        { debut: 0, fin: 10 },
        { debut: 5, fin: 20 },
      ]),
    ).toBe(20)
  })

  it('vaut 0 pour une liste vide', () => {
    expect(duree([])).toBe(0)
  })
})

describe('seChevauchent', () => {
  it('est vrai pour deux plages qui ont un créneau commun', () => {
    expect(seChevauchent({ debut: 0, fin: 10 }, { debut: 9, fin: 20 })).toBe(true)
    expect(seChevauchent({ debut: 0, fin: 30 }, { debut: 10, fin: 20 })).toBe(true)
  })

  it('est faux pour deux plages contiguës, dans les deux sens', () => {
    expect(seChevauchent({ debut: 0, fin: 10 }, { debut: 10, fin: 20 })).toBe(false)
    expect(seChevauchent({ debut: 10, fin: 20 }, { debut: 0, fin: 10 })).toBe(false)
  })

  it('est faux pour deux plages disjointes', () => {
    expect(seChevauchent({ debut: 0, fin: 10 }, { debut: 15, fin: 20 })).toBe(false)
  })
})
