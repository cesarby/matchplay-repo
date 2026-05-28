import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'

import ProfilePage from '../pages/ProfilePage'

const API = '/api/v1'

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: {
      userId: 1,
      username: 'alice',
      email: 'a@a.es',
      avatarCode: 'avatar_07',
    },
    status: 'authenticated',
  }),
}))

function renderPage(path = '/profile') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<div data-testid="login">login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('ProfilePage', () => {
  it('renderiza secciones cuando hay perfil cargado', async () => {
    server.use(
      http.get(`${API}/me/profile`, () =>
        HttpResponse.json({
          username: 'alice',
          email: 'a@a.es',
          avatarCode: 'avatar_07',
          bio: 'Hello.',
          favoriteGames: [],
        }),
      ),
    )
    renderPage()
    expect(await screen.findByRole('heading', { name: /@alice/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Hello\./).length).toBeGreaterThan(0)
    // Heading "Avatar" de la sección AvatarPicker (uppercase via CSS)
    expect(screen.getAllByText(/avatar/i).length).toBeGreaterThan(0)
  })
})
