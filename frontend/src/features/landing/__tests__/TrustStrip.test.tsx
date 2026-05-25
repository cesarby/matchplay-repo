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
    expect(screen.getByText('142')).toBeInTheDocument()
    expect(screen.getByText('387')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
  })
})
