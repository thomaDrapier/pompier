import { describe, expect, it } from 'vitest'
import {
  changerChamp,
  dureeEnDirect,
  etatInitialCreation,
  etatInitialModification,
} from './etat-formulaire'
import type { EtatFormulaire } from './etat-formulaire'
import {
  MESSAGE_CHAMP_OBLIGATOIRE,
  MESSAGE_DOUBLON,
  MESSAGE_FIN_AVANT_DEBUT,
  lireSaisie,
  verifierConflits,
} from './regles-saisie'
import type { ActiviteVoisine, ChampsSaisie, NaturePourControle, SaisieValide } from './regles-saisie'
import { instantParis } from '@/lib/temps'

const natures: NaturePourControle[] = [
  { id: 'astreinte', libelle: 'Astreinte', estAstreinte: true },
  { id: 'intervention', libelle: 'Intervention', estAstreinte: false },
  { id: 'garde', libelle: 'Garde', estAstreinte: false },
]

function paris(texte: string): Date {
  const [date, heure] = texte.split(' ')
  return instantParis(date, heure) as Date
}

function saisie(natureId: string, debut: string, fin: string): SaisieValide {
  return { natureId, debut: paris(debut), fin: paris(fin), note: null }
}

function voisine(id: string, natureId: string, debut: string, fin: string): ActiviteVoisine {
  return { id, natureId, debut: paris(debut), fin: paris(fin) }
}

const champsComplets: ChampsSaisie = {
  natureId: 'astreinte',
  dateDebut: '2026-06-26',
  heureDebut: '08:00',
  dateFin: '2026-06-26',
  heureFin: '12:00',
  note: '',
}

describe('lireSaisie : contrôles bloquants sur les champs', () => {
  it('accepte une saisie complète et la convertit en instants', () => {
    const { saisie: lue, erreurs } = lireSaisie({ ...champsComplets, note: '  renfort  ' })

    expect(erreurs).toEqual({})
    expect(lue).toEqual({
      natureId: 'astreinte',
      debut: new Date('2026-06-26T06:00:00Z'),
      fin: new Date('2026-06-26T10:00:00Z'),
      note: 'renfort',
    })
  })

  it('une note vide est enregistrée comme absente', () => {
    expect(lireSaisie({ ...champsComplets, note: '   ' }).saisie?.note).toBeNull()
  })

  it('signale chaque champ obligatoire vide', () => {
    const { saisie: lue, erreurs } = lireSaisie({
      natureId: '',
      dateDebut: '',
      heureDebut: '',
      dateFin: '2026-06-26',
      heureFin: '',
      note: '',
    })

    expect(lue).toBeNull()
    expect(erreurs).toEqual({
      nature: MESSAGE_CHAMP_OBLIGATOIRE,
      debut: MESSAGE_CHAMP_OBLIGATOIRE,
      fin: MESSAGE_CHAMP_OBLIGATOIRE,
    })
  })

  it('signale une heure de fin manquante alors que la date de fin est préremplie', () => {
    const { saisie: lue, erreurs } = lireSaisie({ ...champsComplets, heureFin: '' })

    expect(lue).toBeNull()
    expect(erreurs).toEqual({ fin: MESSAGE_CHAMP_OBLIGATOIRE })
  })

  it('refuse une fin antérieure ou égale au début', () => {
    expect(lireSaisie({ ...champsComplets, heureFin: '07:00' })).toEqual({
      saisie: null,
      erreurs: { fin: MESSAGE_FIN_AVANT_DEBUT },
    })
    expect(lireSaisie({ ...champsComplets, heureFin: '08:00' }).erreurs).toEqual({
      fin: MESSAGE_FIN_AVANT_DEBUT,
    })
  })
})

describe('verifierConflits', () => {
  it('ne signale rien sans activité voisine', () => {
    expect(
      verifierConflits(saisie('astreinte', '2026-06-26 08:00', '2026-06-26 12:00'), natures, [], null),
    ).toEqual({ bloquant: null, avertissements: [] })
  })

  describe('astreinte (D-010)', () => {
    it('bloque une astreinte qui chevauche une autre astreinte, en la nommant', () => {
      const resultat = verifierConflits(
        saisie('astreinte', '2026-06-26 10:00', '2026-06-26 14:00'),
        natures,
        [voisine('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00')],
        null,
      )

      expect(resultat).toEqual({
        bloquant: 'Cette astreinte chevauche celle du ven. 26/06/2026 08:00 – 12:00.',
        avertissements: [],
      })
    })

    it('accepte deux astreintes contiguës', () => {
      const resultat = verifierConflits(
        saisie('astreinte', '2026-06-26 12:00', '2026-06-26 18:00'),
        natures,
        [
          voisine('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
          voisine('a2', 'astreinte', '2026-06-26 18:00', '2026-06-27 08:00'),
        ],
        null,
      )

      expect(resultat).toEqual({ bloquant: null, avertissements: [] })
    })

    it('ne signale rien quand une astreinte chevauche une intervention', () => {
      const resultat = verifierConflits(
        saisie('astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
        natures,
        [voisine('i1', 'intervention', '2026-06-26 08:00', '2026-06-26 08:45')],
        null,
      )

      expect(resultat).toEqual({ bloquant: null, avertissements: [] })
    })

    it('en modification, une astreinte ne se gêne pas elle-même', () => {
      const resultat = verifierConflits(
        saisie('astreinte', '2026-06-26 09:00', '2026-06-26 13:00'),
        natures,
        [voisine('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00')],
        'a1',
      )

      expect(resultat).toEqual({ bloquant: null, avertissements: [] })
    })

    it('reste bloquée tant que le chevauchement avec une autre astreinte subsiste', () => {
      const autre = voisine('a2', 'astreinte', '2026-06-26 10:00', '2026-06-26 14:00')
      const inchangee = verifierConflits(
        saisie('astreinte', '2026-06-26 08:00', '2026-06-26 12:00'),
        natures,
        [autre],
        'a1',
      )
      const corrigee = verifierConflits(
        saisie('astreinte', '2026-06-26 08:00', '2026-06-26 10:00'),
        natures,
        [autre],
        'a1',
      )

      expect(inchangee.bloquant).toContain('Cette astreinte chevauche celle du')
      expect(corrigee).toEqual({ bloquant: null, avertissements: [] })
    })

    it('avec plusieurs astreintes en conflit, nomme la première et compte les autres', () => {
      const resultat = verifierConflits(
        saisie('astreinte', '2026-06-26 08:00', '2026-06-28 08:00'),
        natures,
        [
          voisine('a3', 'astreinte', '2026-06-27 20:00', '2026-06-28 06:00'),
          voisine('a1', 'astreinte', '2026-06-26 10:00', '2026-06-26 12:00'),
          voisine('a2', 'astreinte', '2026-06-27 08:00', '2026-06-27 12:00'),
        ],
        null,
      )

      expect(resultat.bloquant).toBe(
        'Cette astreinte chevauche celle du ven. 26/06/2026 10:00 – 12:00 et 2 autres.',
      )
    })
  })

  describe('activité qui n’est pas une astreinte', () => {
    it('ne signale rien quand elle chevauche une astreinte', () => {
      const resultat = verifierConflits(
        saisie('intervention', '2026-06-26 08:00', '2026-06-26 08:45'),
        natures,
        [voisine('a1', 'astreinte', '2026-06-26 08:00', '2026-06-26 12:00')],
        null,
      )

      expect(resultat).toEqual({ bloquant: null, avertissements: [] })
    })

    it('avertit d’un doublon exact (même début, fin et nature)', () => {
      const resultat = verifierConflits(
        saisie('intervention', '2026-06-26 08:00', '2026-06-26 08:45'),
        natures,
        [voisine('i1', 'intervention', '2026-06-26 08:00', '2026-06-26 08:45')],
        null,
      )

      expect(resultat).toEqual({ bloquant: null, avertissements: [MESSAGE_DOUBLON] })
    })

    it('avertit d’un chevauchement avec une autre activité hors astreinte, en la nommant', () => {
      const resultat = verifierConflits(
        saisie('intervention', '2026-06-26 08:30', '2026-06-26 09:30'),
        natures,
        [voisine('g1', 'garde', '2026-06-26 08:00', '2026-06-26 12:00')],
        null,
      )

      expect(resultat).toEqual({
        bloquant: null,
        avertissements: ['Cette activité chevauche Garde, ven. 26/06/2026 08:00 – 12:00.'],
      })
    })

    it('même horaires mais nature différente : chevauchement, pas doublon', () => {
      const resultat = verifierConflits(
        saisie('intervention', '2026-06-26 08:00', '2026-06-26 08:45'),
        natures,
        [voisine('g1', 'garde', '2026-06-26 08:00', '2026-06-26 08:45')],
        null,
      )

      expect(resultat.avertissements).toEqual([
        'Cette activité chevauche Garde, ven. 26/06/2026 08:00 – 08:45.',
      ])
    })

    it('avec plusieurs activités, nomme la première par ordre de début et compte les autres', () => {
      const resultat = verifierConflits(
        saisie('intervention', '2026-06-26 08:00', '2026-06-26 18:00'),
        natures,
        [
          voisine('g2', 'garde', '2026-06-26 14:00', '2026-06-26 16:00'),
          voisine('i1', 'intervention', '2026-06-26 09:00', '2026-06-26 10:00'),
        ],
        null,
      )

      expect(resultat.avertissements).toEqual([
        'Cette activité chevauche Intervention, ven. 26/06/2026 09:00 – 10:00 et 1 autre.',
      ])
    })

    it('signale à la fois un doublon et un chevauchement avec une autre activité', () => {
      const resultat = verifierConflits(
        saisie('intervention', '2026-06-26 08:00', '2026-06-26 09:00'),
        natures,
        [
          voisine('i1', 'intervention', '2026-06-26 08:00', '2026-06-26 09:00'),
          voisine('g1', 'garde', '2026-06-26 08:30', '2026-06-26 12:00'),
        ],
        null,
      )

      expect(resultat.avertissements).toEqual([
        MESSAGE_DOUBLON,
        'Cette activité chevauche Garde, ven. 26/06/2026 08:30 – 12:00.',
      ])
    })

    it('ne signale pas deux activités contiguës, ni l’activité en cours de modification', () => {
      const resultat = verifierConflits(
        saisie('intervention', '2026-06-26 09:00', '2026-06-26 10:00'),
        natures,
        [
          voisine('g1', 'garde', '2026-06-26 08:00', '2026-06-26 09:00'),
          voisine('moi', 'intervention', '2026-06-26 09:00', '2026-06-26 10:00'),
        ],
        'moi',
      )

      expect(resultat).toEqual({ bloquant: null, avertissements: [] })
    })
  })
})

describe('état du formulaire', () => {
  describe('valeurs par défaut en création', () => {
    it('début = maintenant arrondi au quart d’heure ; date de fin = date de début ; heure de fin vide', () => {
      const etat = etatInitialCreation(new Date('2026-06-26T06:08:00Z'), 'astreinte') // 08:08 à Paris

      expect(etat).toEqual({
        natureId: 'astreinte',
        dateDebut: '2026-06-26',
        heureDebut: '08:15',
        dateFin: '2026-06-26',
        heureFin: '',
        note: '',
        dateFinModifiee: false,
      })
    })

    it('à 23:55, le début arrondi passe au lendemain à 00:00', () => {
      const etat = etatInitialCreation(new Date('2026-06-26T21:55:00Z'), 'astreinte')

      expect(etat).toMatchObject({ dateDebut: '2026-06-27', heureDebut: '00:00', dateFin: '2026-06-27' })
    })
  })

  describe('règle « fin au lendemain »', () => {
    const depart: EtatFormulaire = {
      natureId: 'astreinte',
      dateDebut: '2026-06-26',
      heureDebut: '18:00',
      dateFin: '2026-06-26',
      heureFin: '',
      note: '',
      dateFinModifiee: false,
    }

    it('18:00 → 08:00 donne le lendemain, durée 14 h', () => {
      const etat = changerChamp(depart, 'heureFin', '08:00')

      expect(etat.dateFin).toBe('2026-06-27')
      expect(dureeEnDirect(etat)).toBe(14 * 60)
    })

    it('08:00 → 12:00 reste le même jour, durée 4 h', () => {
      const etat = changerChamp(changerChamp(depart, 'heureDebut', '08:00'), 'heureFin', '12:00')

      expect(etat.dateFin).toBe('2026-06-26')
      expect(dureeEnDirect(etat)).toBe(4 * 60)
    })

    it('la date de fin suit la date de début, et revient au même jour si l’heure de fin repasse après le début', () => {
      let etat = changerChamp(depart, 'heureFin', '08:00')
      expect(etat.dateFin).toBe('2026-06-27')

      etat = changerChamp(etat, 'dateDebut', '2026-07-03')
      expect(etat.dateFin).toBe('2026-07-04')

      etat = changerChamp(etat, 'heureFin', '22:00')
      expect(etat.dateFin).toBe('2026-07-03')
    })

    it('une fois la date de fin modifiée par l’utilisateur, plus de bascule automatique', () => {
      let etat = changerChamp(depart, 'dateFin', '2026-06-28')
      expect(etat.dateFinModifiee).toBe(true)

      etat = changerChamp(etat, 'heureFin', '08:00')
      expect(etat.dateFin).toBe('2026-06-28')

      etat = changerChamp(etat, 'dateDebut', '2026-06-27')
      etat = changerChamp(etat, 'heureDebut', '20:00')
      expect(etat.dateFin).toBe('2026-06-28')
    })

    it('nuit du passage à l’heure d’hiver : 24/10/2026 20:00 → 08:00, durée affichée 13 h', () => {
      let etat = changerChamp(depart, 'dateDebut', '2026-10-24')
      etat = changerChamp(etat, 'heureDebut', '20:00')
      etat = changerChamp(etat, 'heureFin', '08:00')

      expect(etat.dateFin).toBe('2026-10-25')
      expect(dureeEnDirect(etat)).toBe(13 * 60)
    })

    it('nuit du passage à l’heure d’été : 27/03/2027 20:00 → 08:00, durée affichée 11 h', () => {
      let etat = changerChamp(depart, 'dateDebut', '2027-03-27')
      etat = changerChamp(etat, 'heureDebut', '20:00')
      etat = changerChamp(etat, 'heureFin', '08:00')

      expect(etat.dateFin).toBe('2027-03-28')
      expect(dureeEnDirect(etat)).toBe(11 * 60)
    })

    it('les autres champs ne déplacent pas la date de fin', () => {
      const etat = changerChamp(changerChamp(depart, 'note', 'renfort'), 'natureId', 'intervention')

      expect(etat).toMatchObject({ dateFin: '2026-06-26', note: 'renfort', natureId: 'intervention' })
    })
  })

  describe('dureeEnDirect', () => {
    it('est nulle tant que la fin manque ou n’est pas après le début', () => {
      const etat = etatInitialCreation(new Date('2026-06-26T06:00:00Z'), 'astreinte')

      expect(dureeEnDirect(etat)).toBeNull()
      expect(dureeEnDirect({ ...etat, heureFin: '07:00', dateFinModifiee: true })).toBeNull()
    })
  })

  describe('modification', () => {
    it('reprend les valeurs de l’activité et ne recalcule pas sa date de fin', () => {
      const etat = etatInitialModification({
        id: 'a1',
        user_id: 'u1',
        activity_type_id: 'astreinte',
        debut: '2026-06-26T18:00:00+02:00',
        fin: '2026-06-28T08:00:00+02:00',
        note: 'week-end',
        cree_le: '2026-06-01T00:00:00+00:00',
        modifie_le: '2026-06-01T00:00:00+00:00',
      })

      expect(etat).toEqual({
        natureId: 'astreinte',
        dateDebut: '2026-06-26',
        heureDebut: '18:00',
        dateFin: '2026-06-28',
        heureFin: '08:00',
        note: 'week-end',
        dateFinModifiee: true,
      })
      expect(changerChamp(etat, 'heureFin', '10:00').dateFin).toBe('2026-06-28')
    })
  })
})
