import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import LandingPage from '../pages/LandingPage'

// Mock de LandingContent para aislar el test de redirect
vi.mock('../components/LandingContent', () => ({
  LandingContent: () => <div data-testid="landing-content">Landing</div>,
}))

// Mock de AuthBootSplash
vi.mock('@/features/auth/components/AuthBootSplash', () => ({
  AuthBootSplash: () => <div data-testid="boot-splash">Loading…</div>,
}))

// Mock del hook useAuth — controlamos el status externamente
const mockUseAuth = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sessions" element={<div data-testid="sessions-page">Sessions</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('<LandingPage>', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('renders LandingContent when anonymous', () => {
    mockUseAuth.mockReturnValue({ status: 'anonymous', user: null, isAuthenticated: false })
    renderPage()
    expect(screen.getByTestId('landing-content')).toBeInTheDocument()
  })

  it('shows AuthBootSplash while idle', () => {
    mockUseAuth.mockReturnValue({ status: 'idle', user: null, isAuthenticated: false })
    renderPage()
    expect(screen.getByTestId('boot-splash')).toBeInTheDocument()
  })

  it('shows AuthBootSplash while booting', () => {
    mockUseAuth.mockReturnValue({ status: 'booting', user: null, isAuthenticated: false })
    renderPage()
    expect(screen.getByTestId('boot-splash')).toBeInTheDocument()
  })

  it('redirects to /sessions when authenticated', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      user: { id: 1, email: 'a@a.com' },
      isAuthenticated: true,
    })
    renderPage()
    expect(screen.getByTestId('sessions-page')).toBeInTheDocument()
    expect(screen.queryByTestId('landing-content')).not.toBeInTheDocument()
  })
})
