import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'

import { CreateSessionForm } from '../components/CreateSessionForm'

const API = '/api/v1'

// Picker de fecha mockeado a un input nativo para no tener que clicar
// el popover en cada test. La UX del calendario tiene tests propios en
// SessionDateTimePicker.test.tsx.
vi.mock('../components/SessionDateTimePicker', () => ({
  SessionDateTimePicker: ({
    label,
    value,
    onChange,
    error,
  }: {
    label: string
    value: string
    onChange: (next: string) => void
    error?: string
  }) => (
    <div>
      <label htmlFor="mock-date">{label}</label>
      <input
        id="mock-date"
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}))

// Geo mockeado
vi.mock('@/features/geo/hooks/useGeo', () => ({
  useProvincesQuery: () => ({
    data: [{ code: 'MAD', name: 'Madrid' }],
    isLoading: false,
  }),
  useCitiesQuery: (code?: string) => ({
    data: code === 'MAD' ? [{ code: 'MAD01', name: 'Madrid', provinceCode: 'MAD' }] : [],
    isLoading: false,
  }),
  useAreasQuery: (code?: string) => ({
    data: code === 'MAD01' ? [{ code: 'MAD01-01', name: 'Centro', cityCode: 'MAD01' }] : [],
    isLoading: false,
  }),
}))

function renderForm() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/sessions/new']}>
        <Routes>
          <Route path="/sessions/new" element={<CreateSessionForm />} />
          <Route path="/sessions/:id" element={<div data-testid="detail">detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const GAMES_RESPONSE = {
  content: [
    {
      bggId: 13,
      name: 'Catan',
      year: 1995,
      minPlayers: 3,
      maxPlayers: 4,
      minPlayTimeMinutes: 60,
      maxPlayTimeMinutes: 120,
      thumbnailUrl: null,
      imageUrl: null,
      isExpansion: false,
      hasExpansions: true,
      baseGameBggId: null,
    },
  ],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  last: true,
}

describe('<CreateSessionForm>', () => {
  it('renders all primary fields', () => {
    renderForm()
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/juego/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/provincia/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^ciudad$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /publicar partida/i })).toBeInTheDocument()
  })

  it('shows required errors when submitting empty', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /publicar partida/i }))

    // Hay varios "Campo obligatorio" / "obligatorio" en distintos campos
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1))
  })

  it('rejects past dates and shows specific error', async () => {
    server.use(http.get(`${API}/games`, () => HttpResponse.json(GAMES_RESPONSE)))
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/título/i), 'Catan Night')
    await user.selectOptions(screen.getByLabelText(/provincia/i), 'MAD')
    await user.selectOptions(screen.getByLabelText(/^ciudad$/i), 'MAD01')
    await user.selectOptions(screen.getByLabelText(/zona/i), 'MAD01-01')
    // datetime-local con valor en el pasado
    await user.type(screen.getByLabelText(/fecha/i), '2000-01-15T20:00')

    // Buscar y seleccionar el juego
    await user.type(screen.getByLabelText(/juego/i), 'Catan')
    const option = await screen.findByText('Catan', { selector: '.font-medium' })
    await user.click(option)

    await user.click(screen.getByRole('button', { name: /publicar partida/i }))
    await waitFor(() => expect(screen.getByText(/fecha debe ser futura/i)).toBeInTheDocument())
  })

  it('on successful submit calls POST /sessions with mapped payload', async () => {
    let postedBody: Record<string, unknown> | null = null
    server.use(
      http.get(`${API}/games`, () => HttpResponse.json(GAMES_RESPONSE)),
      http.post(`${API}/sessions`, async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            id: 999,
            title: postedBody.title,
            description: postedBody.description,
            baseGameId: postedBody.baseGameId,
            baseGameName: 'Catan',
            baseGameThumbnailUrl: null,
            expansions: [],
            creatorGuests: 0,
            cityCode: postedBody.cityCode,
            cityName: 'Madrid',
            areaCode: null,
            areaName: null,
            scheduledAt: postedBody.scheduledAt,
            maxPlayers: postedBody.maxPlayers,
            registeredPlayers: 0,
            waitlistCount: 0,
            status: 'OPEN',
            creatorId: 1,
            creatorUsername: 'alice',
            players: [],
            yourRole: null,
            createdAt: '2030-01-01T00:00:00Z',
            updatedAt: '2030-01-01T00:00:00Z',
          },
          { status: 201 },
        )
      }),
    )

    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/título/i), 'Catan Night')
    await user.type(screen.getByLabelText(/descripción/i), 'Mesa nocturna')
    await user.selectOptions(screen.getByLabelText(/provincia/i), 'MAD')
    await user.selectOptions(screen.getByLabelText(/^ciudad$/i), 'MAD01')
    await user.selectOptions(screen.getByLabelText(/zona/i), 'MAD01-01')
    await user.type(screen.getByLabelText(/fecha/i), '2030-01-15T20:00')

    await user.type(screen.getByLabelText(/juego/i), 'Catan')
    const option = await screen.findByText('Catan', { selector: '.font-medium' })
    await user.click(option)

    // Tras seleccionar el juego, "Plazas" se autocompleta con el max del juego (4).
    // Verificamos que el autocompletado tomó efecto antes de seguir.
    expect(screen.getByDisplayValue('4')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /publicar partida/i }))

    await waitFor(() => expect(screen.getByTestId('detail')).toBeInTheDocument())
    expect(postedBody).toMatchObject({
      title: 'Catan Night',
      baseGameId: 13,
      cityCode: 'MAD01',
      maxPlayers: 4,
    })
  })

  it('maps server max-above-game error to maxPlayers field', async () => {
    server.use(
      http.get(`${API}/games`, () => HttpResponse.json(GAMES_RESPONSE)),
      http.post(`${API}/sessions`, () =>
        HttpResponse.json(
          {
            status: 400,
            code: 'error.session.max.players.above.game',
            message: 'El máximo solicitado (10) supera el límite del juego (4)',
          },
          { status: 400 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/título/i), 'Catan')
    await user.selectOptions(screen.getByLabelText(/provincia/i), 'MAD')
    await user.selectOptions(screen.getByLabelText(/^ciudad$/i), 'MAD01')
    await user.selectOptions(screen.getByLabelText(/zona/i), 'MAD01-01')
    await user.type(screen.getByLabelText(/fecha/i), '2030-01-15T20:00')
    await user.type(screen.getByLabelText(/juego/i), 'Catan')
    const option = await screen.findByText('Catan', { selector: '.font-medium' })
    await user.click(option)

    await user.click(screen.getByRole('button', { name: /publicar partida/i }))

    await waitFor(() =>
      expect(screen.getByText(/máximo supera el límite del juego/i)).toBeInTheDocument(),
    )
  })
})
