import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculerPeriode } from '@/data/calcul'
import type { LigneActivite, LigneNature } from '@/data/conversions'
import { ListeActivitesScreen } from '@/features/activites/ListeActivitesScreen'
import type { EtatCalculPeriode } from '@/hooks/useCalculPeriode'
import { bornesDuMois } from '@/lib/temps'

// Les hooks de données sont simulés ; le calcul, lui, est fait par le vrai moteur.
const hooks = vi.hoisted(() => ({
  useCalculPeriode: vi.fn(),
  useReferentiel: vi.fn(),
}))
vi.mock('@/hooks/useCalculPeriode', () => ({ useCalculPeriode: hooks.useCalculPeriode }))
vi.mock('@/hooks/useReferentiel', () => ({ useReferentiel: hooks.useReferentiel }))

// Référentiel de test. Tous les taux sont fictifs ; la garde n'a pas de taux.
const natures: LigneNature[] = [
  { id: 'astreinte', code: 'AST', libelle: 'Astreinte', est_astreinte: true, actif: true, ordre: 1 },
  { id: 'intervention', code: 'INT', libelle: 'Intervention', est_astreinte: false, actif: true, ordre: 2 },
  { id: 'garde', code: 'GAR', libelle: 'Garde', est_astreinte: false, actif: true, ordre: 3 },
]
const taux = [
  { id: 't1', grade_id: 'sapeur', activity_type_id: 'astreinte', taux_horaire: 2, date_effet: '2025-01-01' },
  { id: 't2', grade_id: 'sapeur', activity_type_id: 'intervention', taux_horaire: 12, date_effet: '2025-01-01' },
]
const historique = [{ id: 'h1', user_id: 'u1', grade_id: 'sapeur', date_effet: '2025-01-01' }]

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

function calculJuin(lignes: LigneActivite[]): EtatCalculPeriode {
  return {
    calcul: calculerPeriode(lignes, natures, historique, taux, bornesDuMois('2026-06')),
    enChargement: false,
    erreur: null,
  }
}

function Adresse() {
  const location = useLocation()
  return <p data-testid="adresse">{`${location.pathname}${location.search}`}</p>
}

function afficher(adresse = '/activites?mois=2026-06') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[adresse]}>
        <ListeActivitesScreen />
        <Adresse />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  hooks.useReferentiel.mockReturnValue({ data: { natures, grades: [], taux } })
  hooks.useCalculPeriode.mockReturnValue(calculJuin([]))
})

describe('ListeActivitesScreen', () => {
  it('affiche l’état de chargement', () => {
    hooks.useCalculPeriode.mockReturnValue({ calcul: null, enChargement: true, erreur: null })

    afficher()

    expect(screen.getByText('Chargement…')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nouvelle activité' })).toBeInTheDocument()
  })

  it('affiche l’erreur de chargement et le bouton « Réessayer »', () => {
    hooks.useCalculPeriode.mockReturnValue({
      calcul: null,
      enChargement: false,
      erreur: new Error('réseau'),
    })

    afficher()

    expect(screen.getByRole('alert')).toHaveTextContent('n’ont pas pu être chargées')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('affiche « Aucune activité ce mois-ci » pour un mois vide', () => {
    afficher()

    expect(screen.getByRole('heading', { name: 'juin 2026' })).toBeInTheDocument()
    expect(screen.getByText('Aucune activité ce mois-ci')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nouvelle activité' })).toHaveAttribute(
      'href',
      '/activites/nouvelle',
    )
  })

  it('exemple de référence : lignes, durées, montants et totaux du mois', () => {
    hooks.useCalculPeriode.mockReturnValue(
      calculJuin([
        ligne('a1', 'astreinte', '2026-06-26T08:00', '2026-06-26T12:00'),
        ligne('i1', 'intervention', '2026-06-26T08:00', '2026-06-26T08:45'),
      ]),
    )

    afficher()

    const lignes = within(screen.getByRole('list', { name: 'Activités du mois' })).getAllByRole('link')
    expect(lignes).toHaveLength(2)
    const astreinte = lignes.find((l) => l.getAttribute('href') === '/activites/a1') as HTMLElement
    expect(astreinte).toHaveTextContent('Astreinte')
    expect(astreinte).toHaveTextContent('ven. 26/06/2026 08:00 – 12:00')
    expect(astreinte).toHaveTextContent('déclarée 4 h 00 · déduite 0 h 45 · nette 3 h 15')
    expect(astreinte).toHaveTextContent('6,50 €')
    const intervention = lignes.find((l) => l.getAttribute('href') === '/activites/i1') as HTMLElement
    expect(intervention).toHaveTextContent('0 h 45')
    expect(intervention).toHaveTextContent('9,00 €')

    const totaux = screen.getByRole('region', { name: 'Totaux du mois' })
    expect(totaux).toHaveTextContent('Montant total15,50 €')
    expect(totaux).toHaveTextContent('Astreinte nette3 h 15')
    expect(totaux).toHaveTextContent('Astreinte1')
    expect(totaux).toHaveTextContent('Intervention1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('affiche la plus récente en premier', () => {
    hooks.useCalculPeriode.mockReturnValue(
      calculJuin([
        ligne('i1', 'intervention', '2026-06-10T08:00', '2026-06-10T09:00'),
        ligne('i2', 'intervention', '2026-06-20T08:00', '2026-06-20T09:00'),
      ]),
    )

    afficher()

    const lignes = within(screen.getByRole('list', { name: 'Activités du mois' })).getAllByRole('link')
    expect(lignes.map((l) => l.getAttribute('href'))).toEqual(['/activites/i2', '/activites/i1'])
  })

  it('signale les anomalies : bandeau, étiquettes et montant « — »', () => {
    hooks.useCalculPeriode.mockReturnValue(
      calculJuin([
        ligne('a1', 'astreinte', '2026-06-26T08:00', '2026-06-26T12:00'),
        ligne('a2', 'astreinte', '2026-06-26T10:00', '2026-06-26T14:00'),
        ligne('g1', 'garde', '2026-06-27T08:00', '2026-06-27T10:00'),
      ]),
    )

    afficher()

    expect(screen.getByRole('alert')).toHaveTextContent(
      '3 activités non comptées : taux manquant (1), chevauchement d’astreintes (2)',
    )
    const lignes = within(screen.getByRole('list', { name: 'Activités du mois' })).getAllByRole('link')
    const garde = lignes.find((l) => l.getAttribute('href') === '/activites/g1') as HTMLElement
    expect(garde).toHaveTextContent('Taux manquant')
    expect(garde).toHaveTextContent('—')
    const astreinte = lignes.find((l) => l.getAttribute('href') === '/activites/a1') as HTMLElement
    expect(astreinte).toHaveTextContent('Chevauchement d’astreintes')
    expect(astreinte).toHaveTextContent('—')
  })

  it('accorde le bandeau au singulier', () => {
    hooks.useCalculPeriode.mockReturnValue(
      calculJuin([ligne('g1', 'garde', '2026-06-27T08:00', '2026-06-27T10:00')]),
    )

    afficher()

    expect(screen.getByRole('alert')).toHaveTextContent('1 activité non comptée : taux manquant (1)')
  })

  it('le filtre par nature ne s’applique qu’aux lignes : les totaux restent ceux du mois', async () => {
    hooks.useCalculPeriode.mockReturnValue(
      calculJuin([
        ligne('a1', 'astreinte', '2026-06-26T08:00', '2026-06-26T12:00'),
        ligne('i1', 'intervention', '2026-06-26T08:00', '2026-06-26T08:45'),
      ]),
    )
    const utilisateur = userEvent.setup()
    afficher()

    await utilisateur.selectOptions(screen.getByLabelText('Nature'), 'Intervention')

    const lignes = within(screen.getByRole('list', { name: 'Activités du mois' })).getAllByRole('link')
    expect(lignes.map((l) => l.getAttribute('href'))).toEqual(['/activites/i1'])
    expect(screen.getByRole('region', { name: 'Totaux du mois' })).toHaveTextContent(
      'Montant total15,50 €',
    )
    expect(screen.getByTestId('adresse')).toHaveTextContent('/activites?mois=2026-06&nature=intervention')
  })

  it('indique qu’aucune activité ne correspond au filtre', () => {
    hooks.useCalculPeriode.mockReturnValue(
      calculJuin([ligne('a1', 'astreinte', '2026-06-26T08:00', '2026-06-26T12:00')]),
    )

    afficher('/activites?mois=2026-06&nature=intervention')

    expect(screen.getByText('Aucune activité de cette nature ce mois-ci')).toBeInTheDocument()
    expect(screen.getByLabelText('Nature')).toHaveValue('intervention')
  })

  it('change de mois par les boutons, en conservant le filtre', async () => {
    const utilisateur = userEvent.setup()
    afficher('/activites?mois=2026-12&nature=astreinte')

    await utilisateur.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(screen.getByRole('heading', { name: 'janvier 2027' })).toBeInTheDocument()
    expect(screen.getByTestId('adresse')).toHaveTextContent('/activites?mois=2027-01&nature=astreinte')
    expect(hooks.useCalculPeriode).toHaveBeenLastCalledWith(bornesDuMois('2027-01'))

    await utilisateur.click(screen.getByRole('button', { name: 'Mois précédent' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Mois précédent' }))
    expect(screen.getByRole('heading', { name: 'novembre 2026' })).toBeInTheDocument()
  })

  it('ignore un mois mal formé et une nature inconnue : mois en cours, filtre « Toutes »', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-14T10:00:00Z'))
    try {
      afficher('/activites?mois=2026-13&nature=inconnue')

      expect(screen.getByRole('heading', { name: 'novembre 2026' })).toBeInTheDocument()
      expect(screen.getByLabelText('Nature')).toHaveValue('')
      expect(hooks.useCalculPeriode).toHaveBeenLastCalledWith(bornesDuMois('2026-11'))
    } finally {
      vi.useRealTimers()
    }
  })
})
