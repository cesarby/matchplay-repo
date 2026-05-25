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
    expect(location).toContain('province=MAD')
    expect(location).toContain('city=MAD01')
  })

  it('includes game query param when text is entered', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByPlaceholderText(/juego/i), 'Catan')
    await user.click(screen.getByRole('button', { name: /buscar/i }))

    expect(screen.getByTestId('location').textContent).toContain('q=Catan')
  })

  it('city select is disabled until province is selected', () => {
    renderSearch()
    expect(screen.getByLabelText(/ciudad/i)).toBeDisabled()
  })
})
