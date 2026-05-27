import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { HelmetProvider } from 'react-helmet-async'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'

import { SessionChatDrawer } from '../components/SessionChatDrawer'
import type { SessionDetail } from '../types/session.types'

const API = '/api/v1'

const mockUseAuth = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function baseSession(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: 7,
    title: 'Catan Night',
    description: null,
    baseGameId: 13,
    baseGameName: 'Catan',
    baseGameThumbnailUrl: null,
    baseGameSummary: null,
    expansions: [],
    expansionNames: null,
    creatorGuests: 0,
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
    chatUnreadCount: 0,
    chatMessageCount: 0,
    players: [],
    yourRole: 'PLAYER',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function renderDrawer(s: SessionDetail, open = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <SessionChatDrawer session={s} open={open} onClose={() => {}} />
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('SessionChatDrawer', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { userId: 1, username: 'alice', email: 'a@a.es', role: 'USER' },
      status: 'authenticated',
      isAuthenticated: true,
    })
  })

  it('no renderiza nada cuando open=false', () => {
    const { container } = renderDrawer(baseSession(), false)
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza mensajes recibidos del endpoint', async () => {
    server.use(
      http.get(`${API}/sessions/7/messages`, () =>
        HttpResponse.json([
          {
            id: 1,
            userId: 2,
            username: 'bob',
            content: '¡A las 20h en mi casa!',
            createdAt: '2026-01-01T10:00:00Z',
          },
        ]),
      ),
      http.post(
        `${API}/sessions/7/messages/mark-read`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )
    renderDrawer(baseSession())
    expect(await screen.findByText(/a las 20h/i)).toBeInTheDocument()
  })

  it('muestra el aviso de waitlist y oculta el input', async () => {
    server.use(
      http.get(`${API}/sessions/7/messages`, () => HttpResponse.json([])),
      http.post(
        `${API}/sessions/7/messages/mark-read`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )
    renderDrawer(baseSession({ yourRole: 'WAITLIST' }))
    expect(await screen.findByText(/entrarás al chat al apuntarte/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enviar/i })).not.toBeInTheDocument()
  })

  it('envía un mensaje al pulsar Enviar', async () => {
    let posted: { content?: string } = {}
    server.use(
      http.get(`${API}/sessions/7/messages`, () => HttpResponse.json([])),
      http.post(
        `${API}/sessions/7/messages/mark-read`,
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.post(`${API}/sessions/7/messages`, async ({ request }) => {
        posted = (await request.json()) as { content?: string }
        return HttpResponse.json({
          id: 42,
          userId: 1,
          username: 'alice',
          content: posted.content,
          createdAt: new Date().toISOString(),
        })
      }),
    )
    renderDrawer(baseSession())
    const textarea = await screen.findByRole('textbox')
    await userEvent.type(textarea, 'hola a todos')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(posted.content).toBe('hola a todos'))
    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(''))
  })

  it('Enter envía y Shift+Enter no envía', async () => {
    let postCount = 0
    server.use(
      http.get(`${API}/sessions/7/messages`, () => HttpResponse.json([])),
      http.post(
        `${API}/sessions/7/messages/mark-read`,
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.post(`${API}/sessions/7/messages`, async () => {
        postCount++
        return HttpResponse.json({
          id: 1,
          userId: 1,
          username: 'alice',
          content: 'x',
          createdAt: new Date().toISOString(),
        })
      }),
    )
    renderDrawer(baseSession())
    const textarea = await screen.findByRole('textbox')
    await userEvent.type(textarea, 'linea1{Shift>}{Enter}{/Shift}linea2')
    expect(postCount).toBe(0)
    await userEvent.type(textarea, '{Enter}')
    await waitFor(() => expect(postCount).toBe(1))
  })

  it('dispara mark-read al abrir', async () => {
    let markReadCalled = false
    server.use(
      http.get(`${API}/sessions/7/messages`, () => HttpResponse.json([])),
      http.post(`${API}/sessions/7/messages/mark-read`, () => {
        markReadCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderDrawer(baseSession({ chatUnreadCount: 3 }))
    await waitFor(() => expect(markReadCalled).toBe(true))
  })

  it('muestra el contador X/500', async () => {
    server.use(
      http.get(`${API}/sessions/7/messages`, () => HttpResponse.json([])),
      http.post(
        `${API}/sessions/7/messages/mark-read`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )
    renderDrawer(baseSession())
    const textarea = await screen.findByRole('textbox')
    await userEvent.type(textarea, 'hola')
    expect(screen.getByText('4/500')).toBeInTheDocument()
  })
})
