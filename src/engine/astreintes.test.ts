import { describe, expect, it } from 'vitest'
import { plageParis } from './aides-test'
import { calculerDureesAstreinte, detecterChevauchements } from './astreintes'

describe('calculerDureesAstreinte (cahier des charges 3.4)', () => {
  it('exemple de référence du 26/06/2026 : astreinte 08:00–12:00, intervention 08:00–08:45 → nette 3 h 15', () => {
    const astreinte = plageParis('2026-06-26 08:00', '2026-06-26 12:00')
    const autres = [plageParis('2026-06-26 08:00', '2026-06-26 08:45')]

    expect(calculerDureesAstreinte(astreinte, autres)).toEqual({
      dureeDeclareeMin: 240,
      dureeDeduiteMin: 45,
      dureeNetteMin: 195,
    })
  })

  it('sans autre activité, la durée nette est la durée déclarée', () => {
    const astreinte = plageParis('2026-06-26 08:00', '2026-06-26 12:00')

    expect(calculerDureesAstreinte(astreinte, [])).toEqual({
      dureeDeclareeMin: 240,
      dureeDeduiteMin: 0,
      dureeNetteMin: 240,
    })
  })

  it("activité qui commence avant l'astreinte et finit pendant : seule la partie commune est déduite", () => {
    const astreinte = plageParis('2026-06-26 08:00', '2026-06-26 12:00')
    const autres = [plageParis('2026-06-26 07:00', '2026-06-26 08:30')]

    expect(calculerDureesAstreinte(astreinte, autres)).toEqual({
      dureeDeclareeMin: 240,
      dureeDeduiteMin: 30,
      dureeNetteMin: 210,
    })
  })

  it("activité qui dépasse la fin de l'astreinte : seule la partie commune est déduite", () => {
    const astreinte = plageParis('2026-06-26 08:00', '2026-06-26 12:00')
    const autres = [plageParis('2026-06-26 11:00', '2026-06-26 13:30')]

    expect(calculerDureesAstreinte(astreinte, autres)).toEqual({
      dureeDeclareeMin: 240,
      dureeDeduiteMin: 60,
      dureeNetteMin: 180,
    })
  })

  it('plusieurs activités sans chevauchement entre elles : leurs durées se cumulent', () => {
    const astreinte = plageParis('2026-06-26 08:00', '2026-06-26 12:00')
    const autres = [
      plageParis('2026-06-26 08:30', '2026-06-26 09:00'),
      plageParis('2026-06-26 10:00', '2026-06-26 10:45'),
    ]

    expect(calculerDureesAstreinte(astreinte, autres)).toEqual({
      dureeDeclareeMin: 240,
      dureeDeduiteMin: 75,
      dureeNetteMin: 165,
    })
  })

  it('plusieurs activités qui se chevauchent : pas de double déduction', () => {
    const astreinte = plageParis('2026-06-26 08:00', '2026-06-26 12:00')
    // 09:00–10:00 et 09:30–10:30 couvrent 09:00–10:30, soit 90 min et non 120.
    const autres = [
      plageParis('2026-06-26 09:00', '2026-06-26 10:00'),
      plageParis('2026-06-26 09:30', '2026-06-26 10:30'),
    ]

    expect(calculerDureesAstreinte(astreinte, autres)).toEqual({
      dureeDeclareeMin: 240,
      dureeDeduiteMin: 90,
      dureeNetteMin: 150,
    })
  })

  it('astreinte sur plusieurs jours', () => {
    // Du vendredi 08:00 au lundi 08:00 : 72 h = 4320 min.
    const astreinte = plageParis('2026-06-26 08:00', '2026-06-29 08:00')
    const autres = [
      plageParis('2026-06-27 10:00', '2026-06-27 11:30'), // 90 min
      plageParis('2026-06-28 23:00', '2026-06-29 01:00'), // 120 min, à cheval sur minuit
    ]

    expect(calculerDureesAstreinte(astreinte, autres)).toEqual({
      dureeDeclareeMin: 4320,
      dureeDeduiteMin: 210,
      dureeNetteMin: 4110,
    })
  })

  it('astreinte intégralement consommée par une intervention : nette 0', () => {
    const astreinte = plageParis('2026-06-26 08:00', '2026-06-26 12:00')
    const autres = [plageParis('2026-06-26 07:30', '2026-06-26 12:30')]

    expect(calculerDureesAstreinte(astreinte, autres)).toEqual({
      dureeDeclareeMin: 240,
      dureeDeduiteMin: 240,
      dureeNetteMin: 0,
    })
  })

  it("passage à l'heure d'hiver : du 24/10/2026 20:00 au 25/10/2026 08:00 = 13 h", () => {
    const astreinte = plageParis('2026-10-24 20:00', '2026-10-25 08:00')

    expect(calculerDureesAstreinte(astreinte, []).dureeDeclareeMin).toBe(13 * 60)
  })

  it("passage à l'heure d'été : du 27/03/2027 20:00 au 28/03/2027 08:00 = 11 h", () => {
    const astreinte = plageParis('2027-03-27 20:00', '2027-03-28 08:00')

    expect(calculerDureesAstreinte(astreinte, []).dureeDeclareeMin).toBe(11 * 60)
  })

  it("déduction pendant la nuit du passage à l'heure d'hiver", () => {
    const astreinte = plageParis('2026-10-24 20:00', '2026-10-25 08:00')
    const autres = [plageParis('2026-10-24 23:00', '2026-10-25 00:30')]

    expect(calculerDureesAstreinte(astreinte, autres)).toEqual({
      dureeDeclareeMin: 780,
      dureeDeduiteMin: 90,
      dureeNetteMin: 690,
    })
  })
})

describe('detecterChevauchements (D-010)', () => {
  it('ne signale rien pour une seule astreinte ou une liste vide', () => {
    expect(detecterChevauchements([])).toEqual(new Set())
    expect(
      detecterChevauchements([{ id: 'a', plage: plageParis('2026-06-26 08:00', '2026-06-26 12:00') }]),
    ).toEqual(new Set())
  })

  it('ne signale pas deux astreintes contiguës', () => {
    const astreintes = [
      { id: 'a', plage: plageParis('2026-06-26 08:00', '2026-06-26 12:00') },
      { id: 'b', plage: plageParis('2026-06-26 12:00', '2026-06-26 18:00') },
    ]

    expect(detecterChevauchements(astreintes)).toEqual(new Set())
  })

  it('signale les deux astreintes qui se chevauchent, pas les autres', () => {
    const astreintes = [
      { id: 'seule', plage: plageParis('2026-06-25 08:00', '2026-06-25 12:00') },
      { id: 'b', plage: plageParis('2026-06-26 10:00', '2026-06-26 14:00') },
      { id: 'a', plage: plageParis('2026-06-26 08:00', '2026-06-26 12:00') },
    ]

    expect(detecterChevauchements(astreintes)).toEqual(new Set(['a', 'b']))
  })

  it("signale une astreinte contenue dans une autre, ainsi qu'une suivante qui chevauche la grande", () => {
    const astreintes = [
      { id: 'grande', plage: plageParis('2026-06-26 08:00', '2026-06-27 08:00') },
      { id: 'petite', plage: plageParis('2026-06-26 10:00', '2026-06-26 11:00') },
      { id: 'tardive', plage: plageParis('2026-06-26 20:00', '2026-06-27 12:00') },
    ]

    expect(detecterChevauchements(astreintes)).toEqual(new Set(['grande', 'petite', 'tardive']))
  })

  it('signale toute une chaîne a–b–c même si a et c ne se touchent pas', () => {
    const astreintes = [
      { id: 'a', plage: plageParis('2026-06-26 08:00', '2026-06-26 12:00') },
      { id: 'b', plage: plageParis('2026-06-26 11:00', '2026-06-26 16:00') },
      { id: 'c', plage: plageParis('2026-06-26 15:00', '2026-06-26 20:00') },
    ]

    expect(detecterChevauchements(astreintes)).toEqual(new Set(['a', 'b', 'c']))
  })
})
