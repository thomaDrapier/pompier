import { describe, expect, it } from 'vitest'
import {
  MESSAGE_CHAMP_OBLIGATOIRE,
  MESSAGE_DATE_INVALIDE,
  MESSAGE_ORDRE_ENTIER,
  MESSAGE_TAUX_DECIMALES,
  MESSAGE_TAUX_INVALIDE,
  MESSAGE_TAUX_NEGATIF,
  MESSAGE_TAUX_TROP_ELEVE,
  choisirGrade,
  lireDateEffet,
  lireOrdre,
  lireSaisieGrade,
  lireSaisieNature,
  lireSaisieTaux,
  lireTaux,
  lireTexte,
  tauxVersChamp,
} from './regles-admin'

// Tous les taux de ce fichier sont fictifs.

describe('lireTexte (libellé, code)', () => {
  it('retire les espaces de début et de fin', () => {
    expect(lireTexte('  Sapeur  ')).toEqual({ valeur: 'Sapeur', erreur: null })
  })

  it('refuse un texte vide ou fait d’espaces', () => {
    expect(lireTexte('')).toEqual({ valeur: null, erreur: MESSAGE_CHAMP_OBLIGATOIRE })
    expect(lireTexte('   ')).toEqual({ valeur: null, erreur: MESSAGE_CHAMP_OBLIGATOIRE })
  })
})

describe('lireOrdre', () => {
  it('accepte un nombre entier, espaces retirés', () => {
    expect(lireOrdre('3').valeur).toBe(3)
    expect(lireOrdre(' 12 ').valeur).toBe(12)
    expect(lireOrdre('0').valeur).toBe(0)
    expect(lireOrdre('-1').valeur).toBe(-1)
  })

  it('refuse un ordre non entier', () => {
    expect(lireOrdre('2,5').erreur).toBe(MESSAGE_ORDRE_ENTIER)
    expect(lireOrdre('2.5').erreur).toBe(MESSAGE_ORDRE_ENTIER)
    expect(lireOrdre('deux').erreur).toBe(MESSAGE_ORDRE_ENTIER)
    expect(lireOrdre('1e3').erreur).toBe(MESSAGE_ORDRE_ENTIER)
  })

  it('refuse un ordre hors des bornes d’un entier de la base', () => {
    expect(lireOrdre('2147483647').valeur).toBe(2147483647)
    expect(lireOrdre('2147483648').erreur).toBe(MESSAGE_ORDRE_ENTIER)
  })

  it('refuse un ordre vide', () => {
    expect(lireOrdre('  ').erreur).toBe(MESSAGE_CHAMP_OBLIGATOIRE)
  })
})

describe('lireTaux (D-027)', () => {
  it('« 12,5 » → 12,50 €/h (virgule acceptée)', () => {
    expect(lireTaux('12,5')).toEqual({ valeur: 12.5, erreur: null })
  })

  it('« 12.50 » → 12,50 €/h (point accepté)', () => {
    expect(lireTaux('12.50').valeur).toBe(12.5)
  })

  it('« 0 » est accepté : un taux nul est valide', () => {
    expect(lireTaux('0')).toEqual({ valeur: 0, erreur: null })
    expect(lireTaux('0,00').valeur).toBe(0)
  })

  it('« 12,555 » est refusé : 2 décimales au plus', () => {
    expect(lireTaux('12,555').erreur).toBe(MESSAGE_TAUX_DECIMALES)
  })

  it('« -1 » est refusé : taux négatif', () => {
    expect(lireTaux('-1').erreur).toBe(MESSAGE_TAUX_NEGATIF)
    expect(lireTaux('-0,5').erreur).toBe(MESSAGE_TAUX_NEGATIF)
  })

  it('donne une valeur exacte, sans imprécision des nombres à virgule', () => {
    expect(lireTaux('1,15').valeur).toBe(1.15)
    expect(lireTaux('0,1').valeur).toBe(0.1)
    expect(lireTaux(' 12 ').valeur).toBe(12)
    expect(lireTaux('12,').valeur).toBe(12)
  })

  it('refuse un texte qui n’est pas un nombre', () => {
    expect(lireTaux('douze').erreur).toBe(MESSAGE_TAUX_INVALIDE)
    expect(lireTaux('12,5 €').erreur).toBe(MESSAGE_TAUX_INVALIDE)
    expect(lireTaux('1 000').erreur).toBe(MESSAGE_TAUX_INVALIDE)
    expect(lireTaux(',5').erreur).toBe(MESSAGE_TAUX_INVALIDE)
    expect(lireTaux('1,2,3').erreur).toBe(MESSAGE_TAUX_INVALIDE)
  })

  it('refuse un taux vide', () => {
    expect(lireTaux('').erreur).toBe(MESSAGE_CHAMP_OBLIGATOIRE)
  })

  it('refuse un taux au-delà de la capacité de la base (numeric(10, 2))', () => {
    expect(lireTaux('99999999,99').valeur).toBe(99999999.99)
    expect(lireTaux('100000000').erreur).toBe(MESSAGE_TAUX_TROP_ELEVE)
  })
})

describe('lireDateEffet', () => {
  it('accepte une date du calendrier au format du champ date', () => {
    expect(lireDateEffet('2026-02-28')).toEqual({ valeur: '2026-02-28', erreur: null })
    expect(lireDateEffet('2028-02-29').valeur).toBe('2028-02-29')
  })

  it('refuse une date inexistante ou mal formée', () => {
    expect(lireDateEffet('2026-02-30').erreur).toBe(MESSAGE_DATE_INVALIDE)
    expect(lireDateEffet('2027-02-29').erreur).toBe(MESSAGE_DATE_INVALIDE)
    expect(lireDateEffet('01/01/2026').erreur).toBe(MESSAGE_DATE_INVALIDE)
  })

  it('refuse une date vide', () => {
    expect(lireDateEffet('').erreur).toBe(MESSAGE_CHAMP_OBLIGATOIRE)
  })
})

describe('lireSaisieGrade', () => {
  it('renvoie la saisie nettoyée quand tout est valide', () => {
    expect(lireSaisieGrade({ libelle: ' Adjudant ', ordre: '4' })).toEqual({
      saisie: { libelle: 'Adjudant', ordre: 4 },
      erreurs: {},
    })
  })

  it('renvoie l’erreur de chaque champ, et aucune saisie', () => {
    expect(lireSaisieGrade({ libelle: '   ', ordre: '1,5' })).toEqual({
      saisie: null,
      erreurs: { libelle: MESSAGE_CHAMP_OBLIGATOIRE, ordre: MESSAGE_ORDRE_ENTIER },
    })
  })
})

describe('lireSaisieNature', () => {
  it('renvoie la saisie nettoyée, indicateur d’astreinte compris', () => {
    expect(
      lireSaisieNature({ libelle: ' Garde ', code: ' gar ', ordre: '3', estAstreinte: true }),
    ).toEqual({
      saisie: { libelle: 'Garde', code: 'gar', ordre: 3, estAstreinte: true },
      erreurs: {},
    })
  })

  it('signale un code fait d’espaces', () => {
    const lecture = lireSaisieNature({ libelle: 'Garde', code: '  ', ordre: '3', estAstreinte: false })
    expect(lecture.saisie).toBeNull()
    expect(lecture.erreurs).toEqual({ code: MESSAGE_CHAMP_OBLIGATOIRE })
  })
})

describe('lireSaisieTaux', () => {
  it('renvoie le taux et la date d’effet', () => {
    expect(lireSaisieTaux({ taux: '12,5', dateEffet: '2027-01-01' })).toEqual({
      saisie: { tauxHoraire: 12.5, dateEffet: '2027-01-01' },
      erreurs: {},
    })
  })

  it('renvoie les erreurs des deux champs', () => {
    expect(lireSaisieTaux({ taux: '-1', dateEffet: '' })).toEqual({
      saisie: null,
      erreurs: { taux: MESSAGE_TAUX_NEGATIF, dateEffet: MESSAGE_CHAMP_OBLIGATOIRE },
    })
  })
})

describe('tauxVersChamp', () => {
  it('écrit un taux avec 2 décimales et une virgule, relisible par lireTaux', () => {
    expect(tauxVersChamp(12.5)).toBe('12,50')
    expect(tauxVersChamp(0)).toBe('0,00')
    expect(lireTaux(tauxVersChamp(1.15)).valeur).toBe(1.15)
  })
})

describe('choisirGrade (spécifications 6.4)', () => {
  const grades = [{ id: 'sapeur' }, { id: 'caporal' }]

  it('garde le grade demandé dans l’adresse s’il existe', () => {
    expect(choisirGrade(grades, 'caporal')).toBe('caporal')
  })

  it('ignore un identifiant inconnu ou absent : premier grade de la liste', () => {
    expect(choisirGrade(grades, 'inconnu')).toBe('sapeur')
    expect(choisirGrade(grades, null)).toBe('sapeur')
  })

  it('renvoie null sans aucun grade', () => {
    expect(choisirGrade([], 'sapeur')).toBeNull()
  })
})
