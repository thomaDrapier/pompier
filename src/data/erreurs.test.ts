import { describe, expect, it } from 'vitest'
import {
  ErreurAstreinteVerrouillee,
  ErreurChevauchementAstreintes,
  ErreurDejaServi,
  ErreurDonnees,
  ErreurDoublon,
  ErreurTauxNegatif,
  nomContrainte,
  traduireErreur,
  traduireErreurSuppression,
} from './erreurs'

describe('traduireErreur', () => {
  it('reconnaît le chevauchement d’astreintes au code ET au message réunis', () => {
    const erreur = traduireErreur({ code: '23P01', message: 'chevauchement_astreintes' })

    expect(erreur).toBeInstanceOf(ErreurChevauchementAstreintes)
    expect(erreur.message).toBe('Cette astreinte chevauche une autre astreinte.')
  })

  it('ne le reconnaît pas avec le bon code mais un autre message', () => {
    const erreur = traduireErreur({ code: '23P01', message: 'autre contrainte' })

    expect(erreur).not.toBeInstanceOf(ErreurChevauchementAstreintes)
    expect(erreur).toBeInstanceOf(ErreurDonnees)
  })

  it('ne le reconnaît pas avec le bon message mais un autre code', () => {
    const erreur = traduireErreur({ code: '42501', message: 'chevauchement_astreintes' })

    expect(erreur).not.toBeInstanceOf(ErreurChevauchementAstreintes)
    expect(erreur).toBeInstanceOf(ErreurDonnees)
  })

  it('conserve le message et le code des autres erreurs', () => {
    const erreur = traduireErreur({ code: '42501', message: 'accès refusé' })

    expect(erreur).toBeInstanceOf(ErreurDonnees)
    expect(erreur.message).toBe('accès refusé')
    expect((erreur as ErreurDonnees).code).toBe('42501')
    expect((traduireErreur({ message: 'réseau' }) as ErreurDonnees).code).toBeNull()
  })
})

// Messages réels de PostgreSQL (relevés sur Supabase local) : la
// reconnaissance se fait au code ET au nom de la contrainte qu'ils contiennent.
function unicite(contrainte: string) {
  return {
    code: '23505',
    message: `duplicate key value violates unique constraint "${contrainte}"`,
  }
}

describe('traduireErreur : doublons (D-023, D-024, D-026, D-028)', () => {
  it.each([
    ['grades_libelle_unique_ci', 'libelle_grade', 'Un grade porte déjà ce libellé.'],
    ['activity_types_libelle_unique_ci', 'libelle_nature', 'Une nature porte déjà ce libellé.'],
    ['activity_types_code_unique_ci', 'code_nature', 'Une nature porte déjà ce code.'],
    [
      'reference_rates_grade_nature_date_unique',
      'taux',
      'Un taux existe déjà pour ce grade, cette nature et cette date d’effet.',
    ],
    ['user_grade_history_user_date_unique', 'date_effet_grade', 'Un grade est déjà enregistré à cette date.'],
  ])('reconnaît la contrainte %s comme le doublon « %s »', (contrainte, cas, message) => {
    const erreur = traduireErreur(unicite(contrainte))

    expect(erreur).toBeInstanceOf(ErreurDoublon)
    expect((erreur as ErreurDoublon).cas).toBe(cas)
    expect(erreur.message).toBe(message)
  })

  it('ne reconnaît pas une autre contrainte d’unicité', () => {
    expect(traduireErreur(unicite('profiles_pkey'))).toBeInstanceOf(ErreurDonnees)
  })

  it('ne reconnaît pas le nom d’une contrainte d’unicité avec un autre code', () => {
    const erreur = traduireErreur({
      code: '23514',
      message: 'violates constraint "grades_libelle_unique_ci"',
    })

    expect(erreur).not.toBeInstanceOf(ErreurDoublon)
    expect(erreur).toBeInstanceOf(ErreurDonnees)
  })
})

describe('traduireErreur : taux négatif (D-027)', () => {
  it('reconnaît la contrainte check du taux au code ET au nom', () => {
    const erreur = traduireErreur({
      code: '23514',
      message:
        'new row for relation "reference_rates" violates check constraint "reference_rates_taux_positif_ou_nul"',
    })

    expect(erreur).toBeInstanceOf(ErreurTauxNegatif)
  })

  it('ne reconnaît pas une autre contrainte check (fin > début)', () => {
    const erreur = traduireErreur({
      code: '23514',
      message: 'new row for relation "activities" violates check constraint "activities_check"',
    })

    expect(erreur).toBeInstanceOf(ErreurDonnees)
  })
})

describe('traduireErreur : verrou de « est une astreinte » (D-022)', () => {
  it('reconnaît le verrou au code ET au message réunis', () => {
    const erreur = traduireErreur({ code: 'SPV01', message: 'est_astreinte_verrouille' })

    expect(erreur).toBeInstanceOf(ErreurAstreinteVerrouillee)
    expect(erreur.message).toContain('Cette nature a déjà été utilisée.')
  })

  it('ne le reconnaît pas avec un seul des deux', () => {
    expect(traduireErreur({ code: 'SPV01', message: 'autre' })).toBeInstanceOf(ErreurDonnees)
    expect(traduireErreur({ code: 'P0001', message: 'est_astreinte_verrouille' })).toBeInstanceOf(
      ErreurDonnees,
    )
  })
})

describe('traduireErreurSuppression : élément déjà utilisé (D-018)', () => {
  function cleEtrangere(contrainte: string, table: string) {
    return {
      code: '23503',
      message: `update or delete on table "${table}" violates foreign key constraint "${contrainte}" on table "x"`,
    }
  }

  it.each([
    ['reference_rates_grade_id_fkey', 'grades'],
    ['user_grade_history_grade_id_fkey', 'grades'],
    ['reference_rates_activity_type_id_fkey', 'activity_types'],
    ['activities_activity_type_id_fkey', 'activity_types'],
  ])('reconnaît la clé étrangère %s', (contrainte, table) => {
    expect(traduireErreurSuppression(cleEtrangere(contrainte, table))).toBeInstanceOf(ErreurDejaServi)
  })

  it('ne reconnaît pas une autre clé étrangère', () => {
    expect(
      traduireErreurSuppression(cleEtrangere('activities_user_id_fkey', 'profiles')),
    ).toBeInstanceOf(ErreurDonnees)
  })

  it('traduireErreur seule ne transforme pas une violation de clé étrangère en « déjà servi »', () => {
    // À l'insertion, la même clé étrangère signale une référence inexistante.
    expect(
      traduireErreur(cleEtrangere('reference_rates_grade_id_fkey', 'reference_rates')),
    ).toBeInstanceOf(ErreurDonnees)
  })

  it('traduit les autres erreurs comme traduireErreur', () => {
    expect(traduireErreurSuppression({ code: '42501', message: 'refus' })).toBeInstanceOf(
      ErreurDonnees,
    )
    expect(traduireErreurSuppression(unicite('grades_libelle_unique_ci'))).toBeInstanceOf(
      ErreurDoublon,
    )
  })
})

describe('nomContrainte', () => {
  it('lit le nom de la contrainte dans le message, ou renvoie null', () => {
    expect(nomContrainte(unicite('grades_libelle_unique_ci'))).toBe('grades_libelle_unique_ci')
    expect(nomContrainte({ message: 'réseau indisponible' })).toBeNull()
  })
})
