import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SessionFilters, type SessionFiltersValue } from '../components/SessionFilters'

// Mock geo hooks para no depender de red
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
  it('disables city select until a province is chosen', () => {
    renderFilters()
    expect(screen.getByLabelText(/ciudad/i)).toBeDisabled()
  })

  it('enables city select when province is set', () => {
    renderFilters({ provinceCode: 'MAD' })
    expect(screen.getByLabelText(/ciudad/i)).not.toBeDisabled()
  })

  it('changing province emits onChange with province + cityCode=undefined', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters({ provinceCode: 'MAD', cityCode: 'MAD01' })
    await user.selectOptions(screen.getByLabelText(/provincia/i), 'BCN')
    expect(onChange).toHaveBeenCalledWith({ provinceCode: 'BCN', cityCode: undefined })
  })

  it('selecting an empty value emits undefined', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters({ provinceCode: 'MAD' })
    await user.selectOptions(screen.getByLabelText(/provincia/i), '')
    expect(onChange).toHaveBeenCalledWith({ provinceCode: undefined, cityCode: undefined })
  })

  it('shows clear button only when filters are active', () => {
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

  it('changing status emits the new value', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters()
    await user.selectOptions(screen.getByLabelText(/estado/i), 'OPEN')
    expect(onChange).toHaveBeenCalledWith({ status: 'OPEN' })
  })
})
