import { describe, expect, it } from 'vitest'
import type { LigneActivite, LigneHistoriqueGrade, LigneNature, LigneTaux } from './conversions'
import {
  calculerDetaille,
  donneesGraphique,
  plageHistorique,
  plageMois,
  plageSemaine,
  restituerHistorique,
  restituerMois,
  restituerSemaine,
} from './restitutions'

// Référentiel de test. Tous les taux sont fictifs.
const natures: LigneNature[] = [
  { id: 'astreinte', code: 'AST', libelle: 'Astreinte', est_astreinte: true, est_intervention: false, actif: true, ordre: 1 },
  { id: 'vsav', code: 'VSAV', libelle: 'Intervention VSAV', est_astreinte: false, est_intervention: true, actif: true, ordre: 2 },
]
const historique: LigneHistoriqueGrade[] = [
  { id: 'h1', user_id: 'u1', grade_id: 'sapeur', date_effet: '2025-01-01' },
]
const taux: LigneTaux[] = [
  { id: 't1', grade_id: 'sapeur', activity_type_id: 'astreinte', taux_horaire: 2, date_effet: '2025-01-01' },
  { id: 't2', grade_id: 'sapeur', activity_type_id: 'vsav', taux_horaire: 12, date_effet: '2025-01-01' },
]

function ligne(id: string, natureId: string, debut: string, fin: string): LigneActivite {
  return {
    id,
    user_id: 'u1',
    activity_type_id: natureId,
    debut,
    fin,
    note: null,
    cree_le: debut,
    modifie_le: debut,
  }
}

const lignes = [
  // Astreinte à cheval sur mai et juin 2026 (heures d'été : UTC+2).
  ligne('a1', 'astreinte', '2026-05-31T18:00:00+02:00', '2026-06-01T08:00:00+02:00'),
  // Intervention de 2 h en mai, de 1 h en juin.
  ligne('i1', 'vsav', '2026-05-10T10:00:00+02:00', '2026-05-10T12:00:00+02:00'),
  ligne('i2', 'vsav', '2026-06-10T10:00:00+02:00', '2026-06-10T11:00:00+02:00'),
]
const calcul = calculerDetaille(lignes, natures, historique, taux)

describe('plages lues', () => {
  it('un mois est lu avec le mois précédent, pour l’écart', () => {
    expect(plageMois('2026-06')).toEqual({
      debut: new Date('2026-05-01T00:00:00+02:00'),
      fin: new Date('2026-07-01T00:00:00+02:00'),
    })
  })

  it('une semaine ISO, en heure de Paris', () => {
    expect(plageSemaine('2026-W24')).toEqual({
      debut: new Date('2026-06-08T00:00:00+02:00'),
      fin: new Date('2026-06-15T00:00:00+02:00'),
    })
  })

  it('un historique est lu en une seule plage, mois précédant le premier compris', () => {
    expect(plageHistorique(['2026-01', '2026-02', '2026-03'])).toEqual({
      debut: new Date('2025-12-01T00:00:00+01:00'),
      fin: new Date('2026-04-01T00:00:00+02:00'),
    })
  })
})

describe('restituerMois', () => {
  const juin = restituerMois(calcul, '2026-06')

  it('totaux du mois et du mois précédent, écart', () => {
    // Mai : astreinte 14 h à 2,00 € (montant à la période de début) + intervention 2 h à 12,00 €.
    expect(juin.precedent.montants.totalCentimes).toBe(2800 + 2400)
    expect(juin.mois.montants.totalCentimes).toBe(1200)
    expect(juin.ecart).toEqual({ centimes: 1200 - 5200, pourcentage: -77 })
  })

  it('les heures de l’astreinte à cheval sont réparties entre les deux mois', () => {
    expect(juin.precedent.astreintes.dureeNetteMin).toBe(6 * 60)
    expect(juin.mois.astreintes.dureeNetteMin).toBe(8 * 60)
    expect(juin.mois.aCheval).toEqual(['a1'])
  })

  it('semaines ISO du mois, limitées au mois', () => {
    expect(juin.semaines.map((semaine) => semaine.periode.cle)).toEqual([
      '2026-W23',
      '2026-W24',
      '2026-W25',
      '2026-W26',
      '2026-W27',
    ])
    expect(juin.semaines[0].astreintes.dureeNetteMin).toBe(8 * 60)
    expect(juin.semaines[1].montants.totalCentimes).toBe(1200)
  })
})

describe('restituerSemaine', () => {
  it('totaux de la semaine et de ses 7 jours', () => {
    const semaine = restituerSemaine(calcul, '2026-W24')
    expect(semaine.semaine.interventions.nombre).toBe(1)
    expect(semaine.jours).toHaveLength(7)
    expect(semaine.jours[2].montants.totalCentimes).toBe(1200) // mercredi 10/06
  })
})

describe('restituerHistorique', () => {
  it('un total et un écart par mois ; mois futurs à vide ; total des mois affichés', () => {
    const historique3 = restituerHistorique(calcul, ['2026-05', '2026-06', '2026-07'], '2026-06')
    expect(historique3.mois.map((mois) => mois.totaux?.montants.totalCentimes ?? null)).toEqual([
      5200,
      1200,
      null,
    ])
    // Avril vaut 0 € : pas de pourcentage pour mai.
    expect(historique3.mois[0].ecart).toEqual({ centimes: 5200, pourcentage: null })
    expect(historique3.mois[1].ecart).toEqual({ centimes: -4000, pourcentage: -77 })
    expect(historique3.mois[2].ecart).toBeNull()
    expect(historique3.totalCentimes).toBe(6400)
  })
})

describe('donneesGraphique (historique)', () => {
  it('une barre par mois, montants en euros par catégorie ; mois futur vide', () => {
    const historique3 = restituerHistorique(calcul, ['2026-05', '2026-06', '2026-07'], '2026-06')
    expect(donneesGraphique(historique3, (cle) => `L${cle}`)).toEqual([
      { cle: '2026-05', libelle: 'L2026-05', astreinte: 28, intervention: 24, autre: 0 },
      { cle: '2026-06', libelle: 'L2026-06', astreinte: 0, intervention: 12, autre: 0 },
      { cle: '2026-07', libelle: 'L2026-07', astreinte: null, intervention: null, autre: null },
    ])
  })

  it('l’historique additionne les anomalies des mois affichés', () => {
    expect(restituerHistorique(calcul, ['2026-05', '2026-06'], '2026-06').anomalies).toEqual({
      taux_manquant: 0,
      chevauchement_astreintes: 0,
    })
  })
})

describe('restituerSemaine : activités de la semaine', () => {
  it('liste les activités qui commencent dans la semaine, avec leur résultat', () => {
    const semaine = restituerSemaine(calcul, '2026-W24')
    expect(semaine.activites.map((activite) => [activite.resultat.id, activite.resultat.montantCentimes])).toEqual([
      ['i2', 1200],
    ])
  })
})
