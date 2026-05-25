import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'

import SessionsListPage from '../pages/SessionsListPage'

// Geo hooks: no dependen de red
vi.mock('@/features/geo/hooks/useGeo', () => ({
  useProvincesQuery: () => ({ data: [{ code: 'MAD', name: 'Madrid' }] }),
  useCitiesQuery: () => ({ data: [] }),
}))

const API = '/api/v1'

function makeSummary(id: number, title: string) {
  return {
    id,
    title,
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
  }
}

function renderPage(initialEntry = '/sessions') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <SessionsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('<SessionsListPage>', () => {
  it('renders the heading and filters bar', async () => {
    server.use(
      http.get(`${API}/sessions`, () =>
        HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          last: true,
        }),
      ),
    )
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/partidas/i)
    await waitFor(() => expect(screen.getByLabelText(/provincia/i)).toBeInTheDocument())
  })

  it('shows empty state when no sessions match', async () => {
    server.use(
      http.get(`${API}/sessions`, () =>
        HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          last: true,
        }),
      ),
    )
    renderPage()
    await waitFor(() => expect(screen.getByText(/no hay partidas/i)).toBeInTheDocument())
  })

  it('renders session cards when data arrives', async () => {
    server.use(
      http.get(`${API}/sessions`, () =>
        HttpResponse.json({
          content: [makeSummary(1, 'Catan Night'), makeSummary(2, 'Wingspan')],
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1,
          last: true,
        }),
      ),
    )
    renderPage()
    await waitFor(() => expect(screen.getByText('Catan Night')).toBeInTheDocument())
    expect(screen.getByText('Wingspan')).toBeInTheDocument()
  })

  it('passes URL filters to the API request', async () => {
    const calls: URL[] = []
    server.use(
      http.get(`${API}/sessions`, ({ request }) => {
        calls.push(new URL(request.url))
        return HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          last: true,
        })
      }),
    )
    renderPage('/sessions?provinceCode=MAD&cityCode=MAD01&status=OPEN')
    await waitFor(() => expect(calls.length).toBeGreaterThan(0))
    const params = calls[0]!.searchParams
    expect(params.get('provinceCode')).toBe('MAD')
    expect(params.get('cityCode')).toBe('MAD01')
    expect(params.get('status')).toBe('OPEN')
  })

  it('renders pagination when totalPages > 1', async () => {
    server.use(
      http.get(`${API}/sessions`, () =>
        HttpResponse.json({
          content: [makeSummary(1, 'S1')],
          page: 0,
          size: 20,
          totalElements: 50,
          totalPages: 3,
          last: false,
        }),
      ),
    )
    renderPage()
    await waitFor(() => expect(screen.getByText('S1')).toBeInTheDocument())
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('does not render the Create CTA when anonymous', async () => {
    server.use(
      http.get(`${API}/sessions`, () =>
        HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          last: true,
        }),
      ),
    )
    renderPage()
    await waitFor(() => expect(screen.getByText(/no hay partidas/i)).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: /crear partida/i })).not.toBeInTheDocument()
  })
})
