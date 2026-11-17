import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LigneActivite } from '@/data/conversions'
import type { Referentiel } from '@/data/requetes'
import { invaliderReferentielEtCalculs } from '@/hooks/invalidation'
import {
  useRestitutionHistorique,
  useRestitutionMois,
  useRestitutionSemaine,
} from '@/hooks/useRestitutions'

// Supabase simulé : les lectures de src/data/requetes.ts sont remplacées.
const requetes = vi.hoisted(() => ({
  lireReferentiel: vi.fn(),
  lireHistoriqueGrades: vi.fn(),
  lireActivitesPourPeriode: vi.fn(),
}))
vi.mock('@/data/requetes', () => requetes)

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}))

// Référentiel de test. Tous les taux sont fictifs.
const referentiel: Referentiel = {
  natures: [
    { id: 'vsav', code: 'VSAV', libelle: 'Intervention VSAV', est_astreinte: false, est_intervention: true, actif: true, ordre: 1 },
  ],
  grades: [{ id: 'sapeur', libelle: 'Sapeur', ordre: 1, actif: true }],
  taux: [
    { id: 't1', grade_id: 'sapeur', activity_type_id: 'vsav', taux_horaire: 12, date_effet: '2025-01-01' },
  ],
}

function intervention(id: string, debut: string, fin: string): LigneActivite {
  return { id, user_id: 'u1', activity_type_id: 'vsav', debut, fin, note: null, cree_le: debut, modifie_le: debut }
}

let client: QueryClient

function enveloppe({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  requetes.lireReferentiel.mockResolvedValue(referentiel)
  requetes.lireHistoriqueGrades.mockResolvedValue([
    { id: 'h1', user_id: 'u1', grade_id: 'sapeur', date_effet: '2025-01-01' },
  ])
  requetes.lireActivitesPourPeriode.mockResolvedValue([
    intervention('i1', '2026-06-10T10:00:00+02:00', '2026-06-10T11:00:00+02:00'),
  ])
})

describe('useRestitutionMois', () => {
  it('lit le mois et le mois précédent en une seule fois, puis regroupe', async () => {
    const { result } = renderHook(() => useRestitutionMois('2026-06'), { wrapper: enveloppe })

    await waitFor(() => expect(result.current.enChargement).toBe(false))
    expect(result.current.erreur).toBeNull()
    expect(result.current.donnees?.mois.montants.totalCentimes).toBe(1200)
    expect(result.current.donnees?.mois.interventions.nombre).toBe(1)
    expect(requetes.lireActivitesPourPeriode).toHaveBeenCalledTimes(1)
    expect(requetes.lireActivitesPourPeriode).toHaveBeenCalledWith(
      'u1',
      { debut: new Date('2026-05-01T00:00:00+02:00'), fin: new Date('2026-07-01T00:00:00+02:00') },
      [],
    )
  })

  it('est relu et recalculé après invaliderReferentielEtCalculs (D-029)', async () => {
    const { result } = renderHook(() => useRestitutionMois('2026-06'), { wrapper: enveloppe })
    await waitFor(() => expect(result.current.donnees?.mois.montants.totalCentimes).toBe(1200))

    // Une nouvelle intervention apparaît (écriture d'activité, de taux ou de grade).
    requetes.lireActivitesPourPeriode.mockResolvedValue([
      intervention('i1', '2026-06-10T10:00:00+02:00', '2026-06-10T11:00:00+02:00'),
      intervention('i2', '2026-06-11T10:00:00+02:00', '2026-06-11T12:00:00+02:00'),
    ])
    await act(() => invaliderReferentielEtCalculs(client))

    await waitFor(() => expect(result.current.donnees?.mois.montants.totalCentimes).toBe(3600))
    expect(requetes.lireActivitesPourPeriode).toHaveBeenCalledTimes(2)
    expect(requetes.lireReferentiel).toHaveBeenCalledTimes(2)
    expect(requetes.lireHistoriqueGrades).toHaveBeenCalledTimes(2)
  })
})

describe('useRestitutionSemaine', () => {
  it('donne la semaine et ses 7 jours', async () => {
    const { result } = renderHook(() => useRestitutionSemaine('2026-W24'), { wrapper: enveloppe })
    await waitFor(() => expect(result.current.enChargement).toBe(false))
    expect(result.current.donnees?.jours).toHaveLength(7)
    expect(result.current.donnees?.semaine.montants.totalCentimes).toBe(1200)
  })
})

describe('useRestitutionHistorique', () => {
  it('12 mois glissants : une seule lecture couvrant les 13 mois utiles', async () => {
    const { result } = renderHook(
      () => useRestitutionHistorique({ mode: 'glissant', fin: '2026-06' }),
      { wrapper: enveloppe },
    )
    await waitFor(() => expect(result.current.enChargement).toBe(false))

    expect(requetes.lireActivitesPourPeriode).toHaveBeenCalledTimes(1)
    expect(requetes.lireActivitesPourPeriode).toHaveBeenCalledWith(
      'u1',
      { debut: new Date('2025-06-01T00:00:00+02:00'), fin: new Date('2026-07-01T00:00:00+02:00') },
      [],
    )
    expect(result.current.donnees?.mois.map((mois) => mois.cle)[11]).toBe('2026-06')
    expect(result.current.donnees?.totalCentimes).toBe(1200)
  })

  it('année civile : 12 mois de janvier à décembre', async () => {
    const { result } = renderHook(() => useRestitutionHistorique({ mode: 'annee', annee: 2025 }), {
      wrapper: enveloppe,
    })
    await waitFor(() => expect(result.current.enChargement).toBe(false))
    expect(result.current.donnees?.mois.map((mois) => mois.cle)).toEqual([
      '2025-01',
      '2025-02',
      '2025-03',
      '2025-04',
      '2025-05',
      '2025-06',
      '2025-07',
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
    ])
  })
})
