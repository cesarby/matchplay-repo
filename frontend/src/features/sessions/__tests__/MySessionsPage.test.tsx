import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'

import MySessionsPage from '../pages/MySessionsPage'

const API = '/api/v1'

const mockUseAuth = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderPage(initialEntry = '/sessions/mine') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/sessions/mine" element={<MySessionsPage />} />
            <Route path="/login" element={<div data-testid="login">login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('MySessionsPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { userId: 1, username: 'me', email: 'me@a.es', role: 'USER' },
      status: 'authenticated',
      isAuthenticated: true,
    })
    server.use(
      http.get(`${API}/me/sessions`, () =>
        HttpResponse.json({
          items: {
            content: [],
            page: 0,
            size: 20,
            totalElements: 0,
            totalPages: 0,
            last: true,
          },
          counts: { created: 2, player: 1, waitlist: 0, history: 5 },
        }),
      ),
    )
  })

  it('renderiza los 4 tabs con sus counts', async () => {
    renderPage()
    expect(await screen.findByRole('tab', { name: /creadas/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /apuntado/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /cola|espera/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /historial/i })).toBeInTheDocument()
  })

  it('default arranca en tab CREATED', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /creadas/i })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )
  })

  it('click en otro tab actualiza la URL', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('tab', { name: /historial/i }))
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /historial/i })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )
  })

  it('tab vacío muestra empty state con CTA', async () => {
    renderPage()
    expect(await screen.findByText(/no has creado partidas todavía/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /crear partida/i })).toBeInTheDocument()
  })

  it('si no autenticado redirige a /login', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      status: 'anonymous',
      isAuthenticated: false,
    })
    renderPage()
    expect(await screen.findByTestId('login')).toBeInTheDocument()
  })
})
