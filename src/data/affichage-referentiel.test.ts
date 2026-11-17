import { describe, expect, it } from 'vitest'
import type { LigneHistoriqueGrade, LigneTaux } from './conversions'
import { estAdministrateur } from './conversions'
import {
  avecStatut,
  gradeALaDate,
  tauxCouple,
  texteProchainTaux,
  texteTauxEnVigueur,
} from './affichage-referentiel'

describe('texteTauxEnVigueur et texteProchainTaux (spécifications 5.2)', () => {
  it('écrivent le taux et sa date d’effet (taux fictifs)', () => {
    const ligne: LigneTaux = {
      id: 't',
      grade_id: 'g',
      activity_type_id: 'n',
      taux_horaire: 12,
      date_effet: '2026-01-01',
    }
    expect(texteTauxEnVigueur(ligne)).toBe('12,00 €/h depuis le 01/01/2026')
    expect(texteProchainTaux({ ...ligne, taux_horaire: 12.5, date_effet: '2027-07-01' })).toBe(
      '12,50 €/h à partir du 01/07/2027',
    )
  })
})

// Tous les taux de ce fichier sont fictifs.

function taux(id: string, natureId: string, tauxHoraire: number, dateEffet: string): LigneTaux {
  return {
    id,
    grade_id: 'sapeur',
    activity_type_id: natureId,
    taux_horaire: tauxHoraire,
    date_effet: dateEffet,
  }
}

function grade(id: string, gradeId: string, dateEffet: string): LigneHistoriqueGrade {
  return { id, user_id: 'u1', grade_id: gradeId, date_effet: dateEffet }
}

const grille: LigneTaux[] = [
  taux('t1', 'intervention', 12, '2026-01-01'),
  taux('t2', 'intervention', 12.5, '2027-07-01'),
  taux('t3', 'intervention', 11, '2025-01-01'),
  taux('t4', 'astreinte', 2, '2026-01-01'),
  { ...taux('t5', 'intervention', 14, '2026-01-01'), grade_id: 'caporal' },
]

describe('tauxCouple (spécifications 5.2 et 6.4)', () => {
  it('donne le taux en vigueur et le prochain taux du couple', () => {
    expect(tauxCouple(grille, 'sapeur', 'intervention', '2026-11-17')).toEqual({
      enVigueur: grille[0],
      prochain: grille[1],
    })
  })

  it('sans taux futur, prochain est null', () => {
    expect(tauxCouple(grille, 'sapeur', 'astreinte', '2026-11-17')).toEqual({
      enVigueur: grille[3],
      prochain: null,
    })
  })

  it('avant la première date d’effet, seul le prochain taux existe', () => {
    expect(tauxCouple(grille, 'sapeur', 'astreinte', '2025-06-01')).toEqual({
      enVigueur: null,
      prochain: grille[3],
    })
  })

  it('« Aucun taux » : les deux sont null pour un couple sans ligne', () => {
    expect(tauxCouple(grille, 'sapeur', 'garde', '2026-11-17')).toEqual({
      enVigueur: null,
      prochain: null,
    })
  })

  it('un taux de 0,00 €/h est un taux en vigueur comme un autre (D-027)', () => {
    const avecZero = [taux('z', 'formation', 0, '2026-01-01')]
    expect(tauxCouple(avecZero, 'sapeur', 'formation', '2026-11-17').enVigueur).toBe(avecZero[0])
  })
})

describe('avecStatut', () => {
  it('trie les taux d’un couple du plus récent au plus ancien, avec leur statut', () => {
    const couple = grille.filter(
      (l) => l.grade_id === 'sapeur' && l.activity_type_id === 'intervention',
    )

    expect(
      avecStatut(couple, '2026-11-17').map(({ ligne, statut }) => [ligne.id, statut]),
    ).toEqual([
      ['t2', 'a_venir'],
      ['t1', 'en_vigueur'],
      ['t3', 'passe'],
    ])
  })

  it('marque le grade actuel et le grade à venir de l’historique (5.1)', () => {
    const historique = [
      grade('h1', 'sapeur', '2025-01-01'),
      grade('h3', 'sergent', '2027-03-01'),
      grade('h2', 'caporal', '2026-07-01'),
    ]

    expect(
      avecStatut(historique, '2026-11-17').map(({ ligne, statut }) => [ligne.id, statut]),
    ).toEqual([
      ['h3', 'a_venir'],
      ['h2', 'en_vigueur'],
      ['h1', 'passe'],
    ])
  })

  it('ne modifie pas la liste reçue', () => {
    const historique = [grade('h1', 'sapeur', '2025-01-01'), grade('h2', 'caporal', '2026-07-01')]
    avecStatut(historique, '2026-11-17')

    expect(historique.map((l) => l.id)).toEqual(['h1', 'h2'])
  })
})

describe('gradeALaDate', () => {
  const historique = [grade('h1', 'sapeur', '2025-01-01'), grade('h2', 'caporal', '2026-07-01')]

  it('renvoie la ligne du grade en vigueur à la date', () => {
    expect(gradeALaDate(historique, '2026-06-30')?.id).toBe('h1')
    expect(gradeALaDate(historique, '2026-07-01')?.id).toBe('h2')
  })

  it('renvoie null sans grade renseigné à la date (activités en « taux manquant »)', () => {
    expect(gradeALaDate(historique, '2024-12-31')).toBeNull()
    expect(gradeALaDate([], '2026-11-17')).toBeNull()
  })
})

describe('estAdministrateur', () => {
  it('exige le rôle admin ET un compte actif (règle de is_admin())', () => {
    expect(estAdministrateur({ role: 'admin', actif: true })).toBe(true)
    expect(estAdministrateur({ role: 'admin', actif: false })).toBe(false)
    expect(estAdministrateur({ role: 'user', actif: true })).toBe(false)
  })
})
