import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { MobileMenu } from '../MobileMenu'

const mockUseAuth = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/features/auth/hooks/useLogoutMutation', () => ({
  useLogoutMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

function renderMenu(onClose = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/sessions']}>
        <MobileMenu onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const authedUser = {
  userId: 1,
  username: 'cesarby',
  email: 'cesarby@example.com',
  role: 'USER' as const,
  provinceCode: 'MAD',
  cityCode: 'MAD01',
  areaCode: 'MAD01-01',
  ratingAvg: 4.8,
  rewardPoints: 320,
  selectedAvatarCode: 'default',
}

describe('<MobileMenu>', () => {
  it('shows greeting, avatar initial and stats when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: authedUser })
    renderMenu()
    expect(screen.getByText(/hola.*cesarby/i)).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument() // initial
    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText('320')).toBeInTheDocument()
  })

  it('shows "Partidas" and "Crear partida" for authenticated users', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: authedUser })
    renderMenu()
    expect(screen.getByRole('link', { name: /partidas/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /crear partida/i })).toBeInTheDocument()
  })

  it('renders disabled "Mis partidas" and "Mi perfil" with coming-soon badges', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: authedUser })
    renderMenu()
    // No son links (disabled), pero el texto sí está
    expect(screen.getByText(/mis partidas/i)).toBeInTheDocument()
    expect(screen.getByText(/mi perfil/i)).toBeInTheDocument()
    // Dos pills "Próximamente"
    expect(screen.getAllByText(/próximamente/i)).toHaveLength(2)
  })

  it('shows login/register links and no logout when anonymous', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null })
    renderMenu()
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /crear cuenta/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cerrar sesión/i })).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: authedUser })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderMenu(onClose)
    await user.click(screen.getByRole('button', { name: /cerrar menú/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Escape is pressed', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: authedUser })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderMenu(onClose)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('marks current route as active (aria-current=page)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: authedUser })
    renderMenu()
    const partidasLink = screen.getByRole('link', { name: /partidas/i })
    expect(partidasLink).toHaveAttribute('aria-current', 'page')
  })
})
