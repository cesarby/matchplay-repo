import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { UserMenu } from '../UserMenu'

const mockLogout = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { userId: 1, username: 'alice', email: 'a@a.es', avatarCode: 'avatar_07' },
    status: 'authenticated',
  }),
}))
vi.mock('@/features/auth/hooks/useLogoutMutation', () => ({
  useLogoutMutation: () => ({ mutate: mockLogout, isPending: false }),
}))

function renderMenu() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UserMenu', () => {
  it('renderiza el avatar y nombre del usuario en el trigger', () => {
    renderMenu()
    expect(screen.getByRole('button', { name: /alice/i })).toBeInTheDocument()
  })

  it('abre el menú al hacer click en el trigger', async () => {
    renderMenu()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /mi perfil/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /ayuda/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /cerrar sesión/i })).toBeInTheDocument()
  })

  it('cierra el menú con Escape', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('click en Cerrar sesión dispara la mutación de logout', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /cerrar sesión/i }))
    expect(mockLogout).toHaveBeenCalled()
  })

  it('Mis mensajes está disabled (próximamente)', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    const item = screen.getByRole('menuitem', { name: /mis mensajes/i })
    expect(item).toBeDisabled()
  })
})
