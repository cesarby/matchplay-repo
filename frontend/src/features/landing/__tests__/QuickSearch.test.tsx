import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import { QuickSearch } from '../components/QuickSearch'

// Mock geo hooks
vi.mock('@/features/geo/hooks/useGeo', () => ({
  useProvincesQuery: () => ({
    data: [
      { code: 'MAD', name: 'Madrid' },
      { code: 'BCN', name: 'Barcelona' },
    ],
  }),
  useCitiesQuery: (code: string | undefined) => ({
    data: code === 'MAD' ? [{ code: 'MAD01', name: 'Madrid ciudad' }] : [],
  }),
}))

function LocationDisplay() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname + loc.search}</div>
}

function renderSearch() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <QuickSearch />
                <LocationDisplay />
              </>
            }
          />
          <Route
            path="/sessions"
            element={
              <>
                <div data-testid="sessions">sessions</div>
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('<QuickSearch>', () => {
  it('navigates to /sessions with no params on empty submit', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.click(screen.getByRole('button', { name: /buscar/i }))
    expect(screen.getByTestId('location').textContent).toBe('/sessions')
  })

  it('includes province and city params when selected', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.selectOptions(screen.getByLabelText(/provincia/i), 'MAD')
    await user.selectOptions(screen.getByLabelText(/ciudad/i), 'MAD01')
    await user.click(screen.getByRole('button', { name: /buscar/i }))

    const location = screen.getByTestId('location').textContent ?? ''
    expect(location).toContain('provinceCode=MAD')
    expect(location).toContain('cityCode=MAD01')
  })

  it('does NOT add a game param when only text is typed (no selection from BGG)', async () => {
    // El campo "juego" ahora es un typeahead BGG: para añadir `gameId` a la
    // URL hay que SELECCIONAR un resultado del dropdown. Texto suelto no
    // aporta porque el listado no soporta búsqueda full-text.
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByPlaceholderText(/apetece jugar/i), 'Catan')
    await user.click(screen.getByRole('button', { name: /buscar/i }))

    const location = screen.getByTestId('location').textContent ?? ''
    expect(location).not.toContain('gameId=')
    expect(location).not.toContain('q=')
  })

  it('city select is disabled until province is selected', () => {
    renderSearch()
    expect(screen.getByLabelText(/ciudad/i)).toBeDisabled()
  })
})
