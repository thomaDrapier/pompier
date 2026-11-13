import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LigneActivite } from '@/data/conversions'
import { ErreurChevauchementAstreintes, ErreurDonnees } from '@/data/erreurs'
import type { Periode } from '@/data/periode'
import type { Referentiel } from '@/data/requetes'
import { useCalculPeriode } from '@/hooks/useCalculPeriode'
import { useCreerActivite, useModifierActivite, useSupprimerActivite } from '@/hooks/useEcritureActivites'

// Supabase simulé : les fonctions de src/data/requetes.ts sont remplacées,
// aucun appel réseau. Le moteur de calcul, lui, est le vrai.
const requetes = vi.hoisted(() => ({
  lireReferentiel: vi.fn(),
  lireHistoriqueGrades: vi.fn(),
  lireActivitesPourPeriode: vi.fn(),
  creerActivite: vi.fn(),
  modifierActivite: vi.fn(),
  supprimerActivite: vi.fn(),
}))
vi.mock('@/data/requetes', () => requetes)

// Utilisateur connecté simulé.
vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}))

// Référentiel de test. Tous les taux sont fictifs.
const referentiel: Referentiel = {
  natures: [
    { id: 'astreinte', code: 'AST', libelle: 'Astreinte', est_astreinte: true, actif: true, ordre: 1 },
    { id: 'intervention', code: 'INT', libelle: 'Intervention', est_astreinte: false, actif: true, ordre: 2 },
  ],
  grades: [{ id: 'sapeur', libelle: 'Sapeur', ordre: 1 }],
  taux: [
    { id: 't1', grade_id: 'sapeur', activity_type_id: 'astreinte', taux_horaire: 2, date_effet: '2025-01-01' },
    { id: 't2', grade_id: 'sapeur', activity_type_id: 'intervention', taux_horaire: 12, date_effet: '2025-01-01' },
  ],
}

const juin: Periode = {
  debut: new Date('2026-06-01T00:00:00+02:00'),
  fin: new Date('2026-07-01T00:00:00+02:00'),
}

function ligne(id: string, natureId: string, debut: string, fin: string): LigneActivite {
  return {
    id,
    user_id: 'u1',
    activity_type_id: natureId,
    debut: `${debut}:00+02:00`,
    fin: `${fin}:00+02:00`,
    note: null,
    cree_le: '2026-06-01T00:00:00+00:00',
    modifie_le: '2026-06-01T00:00:00+00:00',
  }
}

const astreinte = ligne('a1', 'astreinte', '2026-06-26T08:00', '2026-06-26T12:00')
const intervention = ligne('i1', 'intervention', '2026-06-26T08:00', '2026-06-26T08:45')

// Un client TanStack Query neuf par test, sans nouvelle tentative après une erreur.
function enveloppe() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Enveloppe({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  requetes.lireReferentiel.mockResolvedValue(referentiel)
  requetes.lireHistoriqueGrades.mockResolvedValue([
    { id: 'h1', user_id: 'u1', grade_id: 'sapeur', date_effet: '2025-01-01' },
  ])
  requetes.lireActivitesPourPeriode.mockResolvedValue([astreinte, intervention])
})

describe('useCalculPeriode', () => {
  it('est en chargement, puis renvoie les résultats et les totaux du moteur', async () => {
    const { result } = renderHook(() => useCalculPeriode(juin), { wrapper: enveloppe() })

    expect(result.current).toEqual({ calcul: null, enChargement: true, erreur: null })

    await waitFor(() => expect(result.current.enChargement).toBe(false))
    expect(result.current.erreur).toBeNull()
    expect(result.current.calcul?.activites.map((l) => l.id)).toEqual(['a1', 'i1'])
    expect(result.current.calcul?.resultats).toMatchObject([
      { id: 'a1', dureeNetteMin: 195, montantCentimes: 650, statut: 'ok' },
      { id: 'i1', dureeNetteMin: 45, montantCentimes: 900, statut: 'ok' },
    ])
    expect(result.current.calcul?.totaux.montantCentimes).toBe(1550)
  })

  it('lit les activités de l’utilisateur connecté, en indiquant les natures d’astreinte', async () => {
    const { result } = renderHook(() => useCalculPeriode(juin), { wrapper: enveloppe() })
    await waitFor(() => expect(result.current.enChargement).toBe(false))

    expect(requetes.lireHistoriqueGrades).toHaveBeenCalledWith('u1')
    expect(requetes.lireActivitesPourPeriode).toHaveBeenCalledWith('u1', juin, ['astreinte'])
  })

  it('refait le calcul après une écriture : les totaux se mettent à jour', async () => {
    const wrapper = enveloppe()
    const { result } = renderHook(
      () => ({ calcul: useCalculPeriode(juin), supprimer: useSupprimerActivite() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.calcul.enChargement).toBe(false))
    expect(result.current.calcul.calcul?.totaux.montantCentimes).toBe(1550)

    // L'intervention est supprimée : l'astreinte n'a plus de déduction.
    requetes.supprimerActivite.mockResolvedValue(undefined)
    requetes.lireActivitesPourPeriode.mockResolvedValue([astreinte])
    await act(() => result.current.supprimer.mutateAsync('i1'))

    await waitFor(() => expect(result.current.calcul.calcul?.totaux.montantCentimes).toBe(800))
    expect(requetes.supprimerActivite).toHaveBeenCalledWith('i1')
    expect(result.current.calcul.calcul?.resultats).toMatchObject([
      { id: 'a1', dureeDeduiteMin: 0, dureeNetteMin: 240 },
    ])
  })

  it('renvoie l’erreur de lecture', async () => {
    requetes.lireActivitesPourPeriode.mockRejectedValue(new ErreurDonnees('réseau indisponible'))

    const { result } = renderHook(() => useCalculPeriode(juin), { wrapper: enveloppe() })

    await waitFor(() => expect(result.current.erreur).not.toBeNull())
    expect(result.current.erreur?.message).toBe('réseau indisponible')
    expect(result.current.calcul).toBeNull()
    expect(result.current.enChargement).toBe(false)
  })

  it('renvoie une erreur, sans planter, si une donnée est impossible pour le moteur', async () => {
    requetes.lireActivitesPourPeriode.mockResolvedValue([
      ligne('x', 'nature-inconnue', '2026-06-26T08:00', '2026-06-26T09:00'),
    ])

    const { result } = renderHook(() => useCalculPeriode(juin), { wrapper: enveloppe() })

    await waitFor(() => expect(result.current.erreur).not.toBeNull())
    expect(result.current.erreur?.message).toContain('nature inconnue')
    expect(result.current.calcul).toBeNull()
  })
})

describe('écriture des activités', () => {
  const saisie = {
    natureId: 'astreinte',
    debut: new Date('2026-06-27T08:00:00+02:00'),
    fin: new Date('2026-06-27T12:00:00+02:00'),
  }

  it('useCreerActivite transmet la saisie et renvoie la ligne créée', async () => {
    const creee = ligne('a2', 'astreinte', '2026-06-27T08:00', '2026-06-27T12:00')
    requetes.creerActivite.mockResolvedValue(creee)
    const { result } = renderHook(() => useCreerActivite(), { wrapper: enveloppe() })

    let retour: LigneActivite | undefined
    await act(async () => {
      retour = await result.current.mutateAsync(saisie)
    })

    expect(requetes.creerActivite).toHaveBeenCalledWith(saisie)
    expect(retour).toEqual(creee)
  })

  it('useCreerActivite expose l’erreur métier de chevauchement d’astreintes', async () => {
    requetes.creerActivite.mockRejectedValue(new ErreurChevauchementAstreintes())
    const { result } = renderHook(() => useCreerActivite(), { wrapper: enveloppe() })

    await act(async () => {
      await result.current.mutateAsync(saisie).catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ErreurChevauchementAstreintes)
  })

  it('useModifierActivite transmet l’identifiant et la saisie, et expose l’erreur de chevauchement', async () => {
    requetes.modifierActivite.mockRejectedValue(new ErreurChevauchementAstreintes())
    const { result } = renderHook(() => useModifierActivite(), { wrapper: enveloppe() })

    await act(async () => {
      await result.current.mutateAsync({ id: 'a1', saisie }).catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requetes.modifierActivite).toHaveBeenCalledWith('a1', saisie)
    expect(result.current.error).toBeInstanceOf(ErreurChevauchementAstreintes)
  })
})
