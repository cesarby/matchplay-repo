import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SessionFilters, type SessionFiltersValue } from '../components/SessionFilters'

// Mock geo hooks
vi.mock('@/features/geo/hooks/useGeo', () => ({
  useProvincesQuery: () => ({
    data: [
      { code: 'MAD', name: 'Madrid' },
      { code: 'BCN', name: 'Barcelona' },
    ],
  }),
  useCitiesQuery: (code?: string) => ({
    data: code === 'MAD' ? [{ code: 'MAD01', name: 'Madrid ciudad', provinceCode: 'MAD' }] : [],
  }),
  useAreasQuery: (code?: string) => ({
    data: code === 'MAD01' ? [{ code: 'MAD01-001', name: 'Centro', cityCode: 'MAD01' }] : [],
  }),
}))

function renderFilters(value: SessionFiltersValue = {}, onChange = vi.fn(), onClear = vi.fn()) {
  const qc = new QueryClient()
  render(
    <QueryClientProvider client={qc}>
      <SessionFilters value={value} onChange={onChange} onClear={onClear} />
    </QueryClientProvider>,
  )
  return { onChange, onClear }
}

describe('<SessionFilters>', () => {
  it('disables city and area selects until province is chosen', () => {
    renderFilters()
    expect(screen.getByLabelText(/ciudad/i)).toBeDisabled()
    expect(screen.getByLabelText(/zona/i)).toBeDisabled()
  })

  it('enables city when province is set; area still disabled', () => {
    renderFilters({ provinceCode: 'MAD' })
    expect(screen.getByLabelText(/ciudad/i)).not.toBeDisabled()
    expect(screen.getByLabelText(/zona/i)).toBeDisabled()
  })

  it('enables area when city is set', () => {
    renderFilters({ provinceCode: 'MAD', cityCode: 'MAD01' })
    expect(screen.getByLabelText(/zona/i)).not.toBeDisabled()
  })

  it('changing province emits onChange clearing city and area', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters({ provinceCode: 'MAD', cityCode: 'MAD01' })
    await user.selectOptions(screen.getByLabelText(/provincia/i), 'BCN')
    expect(onChange).toHaveBeenCalledWith({
      provinceCode: 'BCN',
      cityCode: undefined,
      areaCode: undefined,
    })
  })

  it('changing city emits onChange clearing only area', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters({
      provinceCode: 'MAD',
      cityCode: 'MAD01',
      areaCode: 'MAD01-001',
    })
    await user.selectOptions(screen.getByLabelText(/ciudad/i), '')
    expect(onChange).toHaveBeenCalledWith({ cityCode: undefined, areaCode: undefined })
  })

  it('shows clear button only when any filter is active', () => {
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <SessionFilters value={{}} onChange={vi.fn()} onClear={vi.fn()} />
      </QueryClientProvider>,
    )
    expect(screen.queryByRole('button', { name: /limpiar/i })).not.toBeInTheDocument()

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <SessionFilters value={{ provinceCode: 'MAD' }} onChange={vi.fn()} onClear={vi.fn()} />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument()
  })

  it('clear button calls onClear', async () => {
    const user = userEvent.setup()
    const { onClear } = renderFilters({ provinceCode: 'MAD' })
    await user.click(screen.getByRole('button', { name: /limpiar/i }))
    expect(onClear).toHaveBeenCalled()
  })

  it('does NOT render a status filter', () => {
    renderFilters({ provinceCode: 'MAD' })
    expect(screen.queryByLabelText(/estado/i)).not.toBeInTheDocument()
  })
})
