import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CloseSessionModal } from '../components/CloseSessionModal'

// i18n is initialised globally by src/test/setup.ts → '@/shared/i18n/i18n'

describe('CloseSessionModal', () => {
  it('muestra body sin waitlist y dispara onConfirm al confirmar', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <CloseSessionModal
        open
        registeredPlayers={3}
        waitlistCount={0}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    )
    expect(screen.getByText(/3 jugadores/i)).toBeInTheDocument()
    expect(screen.queryByText(/en cola/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /cerrar mesa/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('muestra body con waitlist cuando hay gente en cola', () => {
    render(
      <CloseSessionModal
        open
        registeredPlayers={4}
        waitlistCount={2}
        onConfirm={() => {}}
        onClose={() => {}}
        isPending={false}
      />,
    )
    expect(screen.getByText(/2 en cola/i)).toBeInTheDocument()
  })

  it('no renderiza nada cuando open es false', () => {
    render(
      <CloseSessionModal
        open={false}
        registeredPlayers={3}
        waitlistCount={0}
        onConfirm={() => {}}
        onClose={() => {}}
        isPending={false}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
