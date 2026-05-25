import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'

import SessionDetailPage from '../pages/SessionDetailPage'
import type { SessionDetail } from '../types/session.types'

const API = '/api/v1'

// useAuth mockeable
const mockUseAuth = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function detail(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: 7,
    title: 'Catan Night',
    description: 'Partida de Catan con expansión.',
    baseGameId: 13,
    baseGameName: 'Catan',
    cityCode: 'MAD01',
    cityName: 'Madrid',
    areaCode: null,
    areaName: null,
    scheduledAt: '2030-01-15T20:00:00Z',
    maxPlayers: 4,
    registeredPlayers: 2,
    waitlistCount: 0,
    status: 'OPEN',
    creatorId: 1,
    creatorUsername: 'alice',
    players: [
      {
        userId: 1,
        username: 'alice',
        role: 'PLAYER',
        position: null,
        joinedAt: '2026-01-01T10:00:00Z',
      },
      {
        userId: 2,
        username: 'bob',
        role: 'PLAYER',
        position: null,
        joinedAt: '2026-01-01T11:00:00Z',
      },
    ],
    yourRole: null,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function renderDetail(initialEntry = '/sessions/7') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/sessions/:id" element={<SessionDetailPage />} />
            <Route path="/sessions" element={<div data-testid="list">list</div>} />
            <Route path="/login" element={<div data-testid="login">login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('<SessionDetailPage>', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, status: 'anonymous' })
  })

  it('renders title, description and player list when fetched', async () => {
    server.use(http.get(`${API}/sessions/7`, () => HttpResponse.json(detail())))
    renderDetail()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Catan Night' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Partida de Catan/)).toBeInTheDocument()
    expect(screen.getByText('@alice')).toBeInTheDocument()
    expect(screen.getByText('@bob')).toBeInTheDocument()
  })

  it('shows a join CTA pointing to login when anonymous', async () => {
    server.use(http.get(`${API}/sessions/7`, () => HttpResponse.json(detail())))
    renderDetail()
    const link = await screen.findByRole('link', { name: /unirme/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('/login'))
    expect(link.getAttribute('href')).toContain('from=')
  })

  it('shows Join button when authenticated and yourRole is null', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { userId: 99, username: 'joiner' },
      status: 'authenticated',
    })
    server.use(http.get(`${API}/sessions/7`, () => HttpResponse.json(detail())))
    renderDetail()
    const btn = await screen.findByRole('button', { name: /unirme/i })
    expect(btn).toBeEnabled()
  })

  it('shows Leave button when yourRole is PLAYER', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { userId: 2, username: 'bob' },
      status: 'authenticated',
    })
    server.use(
      http.get(`${API}/sessions/7`, () => HttpResponse.json(detail({ yourRole: 'PLAYER' }))),
    )
    renderDetail()
    expect(await screen.findByRole('button', { name: /salir/i })).toBeInTheDocument()
  })

  it('shows owner actions when current user is the creator', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { userId: 1, username: 'alice' },
      status: 'authenticated',
    })
    server.use(http.get(`${API}/sessions/7`, () => HttpResponse.json(detail())))
    renderDetail()

    expect(await screen.findByRole('button', { name: /cerrar inscripciones/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar partida/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /editar/i })).toBeInTheDocument()
  })

  it('renders waitlist section with positions when waitlist members exist', async () => {
    server.use(
      http.get(`${API}/sessions/7`, () =>
        HttpResponse.json(
          detail({
            registeredPlayers: 4,
            maxPlayers: 4,
            status: 'FULL',
            waitlistCount: 2,
            players: [
              ...detail().players,
              {
                userId: 3,
                username: 'carol',
                role: 'PLAYER',
                position: null,
                joinedAt: '2026-01-01T12:00:00Z',
              },
              {
                userId: 4,
                username: 'dave',
                role: 'PLAYER',
                position: null,
                joinedAt: '2026-01-01T13:00:00Z',
              },
              {
                userId: 5,
                username: 'eve',
                role: 'WAITLIST',
                position: 1,
                joinedAt: '2026-01-01T14:00:00Z',
              },
              {
                userId: 6,
                username: 'frank',
                role: 'WAITLIST',
                position: 2,
                joinedAt: '2026-01-01T15:00:00Z',
              },
            ],
          }),
        ),
      ),
    )
    renderDetail()
    // El heading de la sección, no el contador de la barra de meta
    expect(await screen.findByRole('heading', { name: /lista de espera/i })).toBeInTheDocument()
    expect(screen.getByText('@eve')).toBeInTheDocument()
    expect(screen.getByText('@frank')).toBeInTheDocument()
    expect(screen.getByLabelText('Posición 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Posición 2')).toBeInTheDocument()
  })

  it('owner can cancel session — calls PATCH /status', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { userId: 1, username: 'alice' },
      status: 'authenticated',
    })

    let patchedBody: unknown = null
    server.use(
      http.get(`${API}/sessions/7`, () => HttpResponse.json(detail())),
      http.patch(`${API}/sessions/7/status`, async ({ request }) => {
        patchedBody = await request.json()
        return HttpResponse.json(detail({ status: 'CANCELLED' }))
      }),
    )

    renderDetail()
    const cancel = await screen.findByRole('button', { name: /cancelar partida/i })
    await userEvent.click(cancel)

    await waitFor(() => expect(patchedBody).toEqual({ status: 'CANCELLED' }))
  })

  it('hides actions when status is CANCELLED', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { userId: 99, username: 'joiner' },
      status: 'authenticated',
    })
    server.use(
      http.get(`${API}/sessions/7`, () => HttpResponse.json(detail({ status: 'CANCELLED' }))),
    )
    renderDetail()
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('button', { name: /unirme/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /salir/i })).not.toBeInTheDocument()
  })
})
