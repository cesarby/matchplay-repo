import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EditSessionModal } from '../components/EditSessionModal'

// i18n is initialised globally by src/test/setup.ts → '@/shared/i18n/i18n'

describe('EditSessionModal', () => {
  it('llama onSubmit con los valores cambiados al guardar', async () => {
    const onSubmit = vi.fn()
    render(
      <EditSessionModal
        open
        initialScheduledAt="2026-06-01T20:00"
        initialMaxPlayers={4}
        registeredPlayers={2}
        waitlistCount={0}
        onSubmit={onSubmit}
        onClose={() => {}}
        isPending={false}
      />,
    )
    const input = screen.getByLabelText(/plazas máximas/i) as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, '6')
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ maxPlayers: 6, scheduledAt: '2026-06-01T20:00' }),
    )
  })

  it('valida que maxPlayers no baje de los apuntados y no llama onSubmit', async () => {
    const onSubmit = vi.fn()
    render(
      <EditSessionModal
        open
        initialScheduledAt="2026-06-01T20:00"
        initialMaxPlayers={4}
        registeredPlayers={3}
        waitlistCount={0}
        onSubmit={onSubmit}
        onClose={() => {}}
        isPending={false}
      />,
    )
    const input = screen.getByLabelText(/plazas máximas/i) as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, '2')
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toMatch(/mínimo/i)
  })

  it('muestra nota de waitlist cuando hay gente en cola', () => {
    render(
      <EditSessionModal
        open
        initialScheduledAt="2026-06-01T20:00"
        initialMaxPlayers={4}
        registeredPlayers={4}
        waitlistCount={3}
        onSubmit={() => {}}
        onClose={() => {}}
        isPending={false}
      />,
    )
    expect(screen.getByText(/3 personas en cola/i)).toBeInTheDocument()
  })

  it('no renderiza nada cuando open es false', () => {
    render(
      <EditSessionModal
        open={false}
        initialScheduledAt="2026-06-01T20:00"
        initialMaxPlayers={4}
        registeredPlayers={2}
        waitlistCount={0}
        onSubmit={() => {}}
        onClose={() => {}}
        isPending={false}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
