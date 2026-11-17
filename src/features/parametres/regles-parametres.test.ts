import { describe, expect, it } from 'vitest'
import type { LigneGrade } from '@/data/conversions'
import { ErreurDonnees, ErreurDoublon } from '@/data/erreurs'
import { MESSAGE_CHAMP_OBLIGATOIRE, MESSAGE_DATE_INVALIDE } from '@/features/admin/regles-admin'
import { MESSAGES_COMMUNS } from '@/lib/messages'
import {
  dateAConfirmer,
  gradesProposes,
  libelleGrade,
  lireSaisieHistorique,
  messageErreurHistorique,
  messageRecalcul,
} from './regles-parametres'

// 17/11/2026 à 10:00, heure de Paris.
const maintenant = new Date('2026-11-17T09:00:00Z')

describe('dateAConfirmer (D-021, spécifications 5.1)', () => {
  it('ajout à une date passée (la date du jour comprise) : confirmation sur cette date', () => {
    expect(dateAConfirmer(null, '2026-11-17', maintenant)).toBe('2026-11-17')
    expect(dateAConfirmer(null, '2025-01-01', maintenant)).toBe('2025-01-01')
  })

  it('ajout à une date future : aucune confirmation', () => {
    expect(dateAConfirmer(null, '2026-11-18', maintenant)).toBeNull()
  })

  it('correction : confirmation si l’ancienne OU la nouvelle date est passée', () => {
    // Ancienne passée, nouvelle future : les montants changent dès l'ancienne.
    expect(dateAConfirmer('2026-01-01', '2027-01-01', maintenant)).toBe('2026-01-01')
    // Ancienne future, nouvelle passée.
    expect(dateAConfirmer('2027-01-01', '2026-03-01', maintenant)).toBe('2026-03-01')
  })

  it('correction entre deux dates passées : la plus ancienne est citée', () => {
    expect(dateAConfirmer('2025-06-01', '2025-02-01', maintenant)).toBe('2025-02-01')
    expect(dateAConfirmer('2025-02-01', '2025-06-01', maintenant)).toBe('2025-02-01')
  })

  it('correction entre deux dates futures : aucune confirmation', () => {
    expect(dateAConfirmer('2027-01-01', '2027-06-01', maintenant)).toBeNull()
  })

  it('se fonde sur la date de Paris : le 01/01 à 00:30 à Paris, le 01/01 est passé', () => {
    const minuitTrente = new Date('2026-12-31T23:30:00Z') // 01/01/2027 00:30 à Paris
    expect(dateAConfirmer(null, '2027-01-01', minuitTrente)).toBe('2027-01-01')
  })
})

describe('messageRecalcul', () => {
  it('cite la date au format JJ/MM/AAAA (texte de la spécification 5.1)', () => {
    expect(messageRecalcul('2026-11-17')).toBe(
      'Les montants de vos activités à partir du 17/11/2026 seront recalculés.',
    )
  })
})

describe('lireSaisieHistorique', () => {
  it('renvoie le grade et la date d’effet', () => {
    expect(lireSaisieHistorique({ gradeId: 'sapeur', dateEffet: '2026-11-17' })).toEqual({
      saisie: { gradeId: 'sapeur', dateEffet: '2026-11-17' },
      erreurs: {},
    })
  })

  it('exige le grade et une date existante', () => {
    expect(lireSaisieHistorique({ gradeId: '', dateEffet: '2026-02-30' })).toEqual({
      saisie: null,
      erreurs: { gradeId: MESSAGE_CHAMP_OBLIGATOIRE, dateEffet: MESSAGE_DATE_INVALIDE },
    })
    expect(lireSaisieHistorique({ gradeId: 'sapeur', dateEffet: '' }).erreurs).toEqual({
      dateEffet: MESSAGE_CHAMP_OBLIGATOIRE,
    })
  })
})

describe('gradesProposes et libelleGrade (D-018)', () => {
  const grades: LigneGrade[] = [
    { id: 'sapeur', libelle: 'Sapeur', ordre: 1, actif: true },
    { id: 'ancien', libelle: 'Ancien grade', ordre: 2, actif: false },
    { id: 'caporal', libelle: 'Caporal', ordre: 3, actif: true },
  ]

  it('ajout : grades actifs seulement, dans l’ordre reçu', () => {
    expect(gradesProposes(grades, null).map((g) => g.id)).toEqual(['sapeur', 'caporal'])
  })

  it('correction : le grade archivé déjà présent sur la ligne reste proposé', () => {
    expect(gradesProposes(grades, 'ancien').map((g) => g.id)).toEqual([
      'sapeur',
      'ancien',
      'caporal',
    ])
    expect(gradesProposes(grades, 'sapeur').map((g) => g.id)).toEqual(['sapeur', 'caporal'])
  })

  it('un grade archivé est signalé dans la liste', () => {
    expect(libelleGrade(grades[0])).toBe('Sapeur')
    expect(libelleGrade(grades[1])).toBe('Ancien grade (Archivé)')
  })
})

describe('messageErreurHistorique', () => {
  it('doublon de date d’effet : message de la spécification (D-028)', () => {
    expect(messageErreurHistorique(new ErreurDoublon('date_effet_grade'))).toBe(
      'Un grade est déjà enregistré à cette date.',
    )
  })

  it('autre erreur : message générique', () => {
    expect(messageErreurHistorique(new ErreurDonnees('Failed to fetch'))).toBe(
      MESSAGES_COMMUNS.erreurServeur,
    )
  })
})
