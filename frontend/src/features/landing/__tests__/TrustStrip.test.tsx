import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { TrustStrip } from '../components/TrustStrip'

const mockUsePublicStatsQuery = vi.fn()
vi.mock('../hooks/usePublicStatsQuery', () => ({
  usePublicStatsQuery: () => mockUsePublicStatsQuery(),
}))

function renderStrip() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <TrustStrip />
    </QueryClientProvider>,
  )
}

describe('<TrustStrip>', () => {
  it('shows skeleton placeholders while loading', () => {
    mockUsePublicStatsQuery.mockReturnValue({ isLoading: true, isError: false, data: undefined })
    const { container } = renderStrip()
    // El skeleton usa animate-pulse — verificamos que hay elementos animados
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(3)
  })

  it('renders nothing when there is an error', () => {
    mockUsePublicStatsQuery.mockReturnValue({ isLoading: false, isError: true, data: undefined })
    const { container } = renderStrip()
    // El componente devuelve null — el container estará vacío
    expect(container.firstChild).toBeNull()
  })

  it('renders the three stats on success', () => {
    mockUsePublicStatsQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { activeSessions: 142, activePlayers: 387, cities: 24 },
    })
    renderStrip()
    // Cada número se imprime DOS veces (mobile layout + desktop layout, uno
    // oculto vía CSS responsive). getAllByText cubre ambos casos.
    expect(screen.getAllByText('142').length).toBeGreaterThan(0)
    expect(screen.getAllByText('387').length).toBeGreaterThan(0)
    expect(screen.getAllByText('24').length).toBeGreaterThan(0)
  })
})
