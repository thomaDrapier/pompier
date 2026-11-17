import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cles } from '@/data/cles'
import { ErreurAstreinteVerrouillee, ErreurDejaServi, ErreurDoublon } from '@/data/erreurs'
import {
  useCreerGrade,
  useCreerTaux,
  useModifierNature,
  useNatureUtilisee,
  useSupprimerGrade,
} from '@/hooks/useAdministrationReferentiel'
import {
  useAjouterGradeHistorique,
  useSupprimerGradeHistorique,
} from '@/hooks/useEcritureHistoriqueGrades'
import { useProfil } from '@/hooks/useProfil'

// Supabase simulé : les fonctions de src/data/requetes-referentiel.ts sont
// remplacées, aucun appel réseau.
const requetes = vi.hoisted(() => ({
  lireGrades: vi.fn(),
  creerGrade: vi.fn(),
  modifierGrade: vi.fn(),
  changerActifGrade: vi.fn(),
  supprimerGrade: vi.fn(),
  lireNatures: vi.fn(),
  creerNature: vi.fn(),
  modifierNature: vi.fn(),
  changerActifNature: vi.fn(),
  supprimerNature: vi.fn(),
  natureUtilisee: vi.fn(),
  lireTauxDuGrade: vi.fn(),
  lireHistoriqueTaux: vi.fn(),
  creerTaux: vi.fn(),
  corrigerTaux: vi.fn(),
  supprimerTaux: vi.fn(),
  ajouterGradeHistorique: vi.fn(),
  corrigerGradeHistorique: vi.fn(),
  supprimerGradeHistorique: vi.fn(),
  lireProfil: vi.fn(),
}))
vi.mock('@/data/requetes-referentiel', () => requetes)

// Utilisateur connecté simulé.
vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}))

let client: QueryClient

function enveloppe({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
})

/** Préfixes des clés invalidées pendant le test. */
function clesInvalidees(espion: { mock: { calls: unknown[][] } }): unknown[] {
  return espion.mock.calls.map((appel) => (appel[0] as { queryKey: unknown }).queryKey)
}

describe('invalidations après une écriture', () => {
  it('une écriture du référentiel invalide le référentiel ET les calculs de période', async () => {
    requetes.creerTaux.mockResolvedValue({ id: 't1' })
    const espion = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreerTaux(), { wrapper: enveloppe })

    const saisie = { gradeId: 'g', natureId: 'n', tauxHoraire: 0, dateEffet: '2026-01-01' }
    await act(() => result.current.mutateAsync(saisie))

    expect(requetes.creerTaux).toHaveBeenCalledWith(saisie)
    expect(clesInvalidees(espion)).toEqual(
      expect.arrayContaining([cles.referentiel, cles.historiquesGrades, cles.activites]),
    )
  })

  it('une écriture de l’historique de grades invalide aussi les calculs de période', async () => {
    requetes.ajouterGradeHistorique.mockResolvedValue({ id: 'h1' })
    const espion = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useAjouterGradeHistorique(), { wrapper: enveloppe })

    await act(() => result.current.mutateAsync({ gradeId: 'g', dateEffet: '2026-01-01' }))

    // L'historique est écrit pour l'utilisateur connecté.
    expect(requetes.ajouterGradeHistorique).toHaveBeenCalledWith('u1', {
      gradeId: 'g',
      dateEffet: '2026-01-01',
    })
    expect(clesInvalidees(espion)).toEqual(
      expect.arrayContaining([cles.referentiel, cles.historiquesGrades, cles.activites]),
    )
  })

  it('les clés de calcul sont bien couvertes par les préfixes invalidés', () => {
    // useCalculPeriode lit cles.referentiel, cles.historiqueGrades(userId) et
    // cles.activitesPeriode(...) : chacune commence par un préfixe invalidé.
    expect(cles.historiqueGrades('u1').slice(0, 1)).toEqual(cles.historiquesGrades)
    expect(cles.grades.slice(0, 1)).toEqual(cles.referentiel)
    expect(cles.historiqueTaux('g', 'n').slice(0, 1)).toEqual(cles.referentiel)
    expect(cles.natureUtilisee('n').slice(0, 1)).toEqual(cles.referentiel)
  })

  it('une écriture refusée n’invalide rien', async () => {
    requetes.supprimerGradeHistorique.mockRejectedValue(new Error('refus'))
    const espion = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useSupprimerGradeHistorique(), { wrapper: enveloppe })

    await act(async () => {
      await result.current.mutateAsync('h1').catch(() => {})
    })

    expect(espion).not.toHaveBeenCalled()
  })
})

describe('erreurs typées exposées par les hooks', () => {
  it('doublon de libellé de grade (D-024)', async () => {
    requetes.creerGrade.mockRejectedValue(new ErreurDoublon('libelle_grade'))
    const { result } = renderHook(() => useCreerGrade(), { wrapper: enveloppe })

    await act(async () => {
      await result.current.mutateAsync({ libelle: 'sapeur', ordre: 1 }).catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ErreurDoublon)
    expect(result.current.error?.message).toBe('Un grade porte déjà ce libellé.')
  })

  it('suppression d’un grade déjà utilisé (D-018)', async () => {
    requetes.supprimerGrade.mockRejectedValue(new ErreurDejaServi())
    const { result } = renderHook(() => useSupprimerGrade(), { wrapper: enveloppe })

    await act(async () => {
      await result.current.mutateAsync('g1').catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ErreurDejaServi)
  })

  it('verrou de « est une astreinte » (D-022)', async () => {
    requetes.modifierNature.mockRejectedValue(new ErreurAstreinteVerrouillee())
    const { result } = renderHook(() => useModifierNature(), { wrapper: enveloppe })

    const saisie = { libelle: 'Garde', code: 'GAR', ordre: 3, estAstreinte: true }
    await act(async () => {
      await result.current.mutateAsync({ id: 'n1', saisie }).catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requetes.modifierNature).toHaveBeenCalledWith('n1', saisie)
    expect(result.current.error).toBeInstanceOf(ErreurAstreinteVerrouillee)
  })
})

describe('lectures', () => {
  it('useNatureUtilisee ne lit rien sans identifiant, puis renvoie le booléen', async () => {
    requetes.natureUtilisee.mockResolvedValue(true)

    const sans = renderHook(() => useNatureUtilisee(undefined), { wrapper: enveloppe })
    expect(sans.result.current.fetchStatus).toBe('idle')
    expect(requetes.natureUtilisee).not.toHaveBeenCalled()

    const avec = renderHook(() => useNatureUtilisee('n1'), { wrapper: enveloppe })
    await waitFor(() => expect(avec.result.current.data).toBe(true))
    expect(requetes.natureUtilisee).toHaveBeenCalledWith('n1')
  })

  it('useProfil lit le profil de l’utilisateur connecté', async () => {
    requetes.lireProfil.mockResolvedValue({ role: 'admin', actif: true, estAdmin: true })
    const { result } = renderHook(() => useProfil(), { wrapper: enveloppe })

    await waitFor(() => expect(result.current.data?.estAdmin).toBe(true))
    expect(requetes.lireProfil).toHaveBeenCalledWith('u1')
  })
})
