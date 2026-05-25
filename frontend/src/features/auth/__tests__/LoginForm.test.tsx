import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'

import { LoginForm } from '../components/LoginForm'
import { useAuthStore } from '../store/authStore'

const API = '/api/v1'

function renderForm(initialEntries: string[] = ['/login']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/" element={<div>home</div>} />
          <Route path="/dashboard" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('<LoginForm>', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      accessTokenExpiresAt: null,
      currentUser: null,
      status: 'idle',
    })
  })

  it('shows inline errors when email is invalid', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText(/Email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/Contraseña/i), 'whatever')
    await user.click(screen.getByRole('button', { name: /Entrar/i }))
    expect(await screen.findByText(/Email inválido/i)).toBeInTheDocument()
  })

  it('logs in and navigates to from when login succeeds', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({
          userId: 1,
          email: 'ana@example.com',
          username: 'ana',
          role: 'USER',
          accessToken: 'access',
          accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
      ),
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json({
          userId: 1,
          email: 'ana@example.com',
          username: 'ana',
          role: 'USER',
          ratingAvg: 0,
          rewardPoints: 0,
          selectedAvatarCode: 'av_01',
        }),
      ),
    )

    const user = userEvent.setup()
    renderForm(['/login?from=/dashboard'])
    await user.type(screen.getByLabelText(/Email/i), 'ana@example.com')
    await user.type(screen.getByLabelText(/Contraseña/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /Entrar/i }))

    await waitFor(() => {
      expect(screen.getByText('dashboard')).toBeInTheDocument()
    })
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('shows banner with invalid credentials code', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          {
            status: 401,
            code: 'error.auth.invalid.credentials',
            message: 'Email o contraseña incorrectos',
          },
          { status: 401 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText(/Email/i), 'ana@example.com')
    await user.type(screen.getByLabelText(/Contraseña/i), 'wrong123')
    await user.click(screen.getByRole('button', { name: /Entrar/i }))
    expect(await screen.findByText(/Email o contraseña incorrectos/i)).toBeInTheDocument()
  })
})
