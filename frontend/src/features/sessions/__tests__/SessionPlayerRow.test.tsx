import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// i18n is initialised globally by src/test/setup.ts

import { SessionPlayerRow } from '../components/SessionPlayerRow'
import type { SessionPlayer } from '../types/session.types'

const player: SessionPlayer = {
  userId: 7,
  username: 'alice',
  role: 'PLAYER',
  position: null,
  joinedAt: '2026-01-01T10:00:00Z',
}

describe('SessionPlayerRow', () => {
  it('renderiza el username del jugador', () => {
    render(
      <ul>
        <SessionPlayerRow player={player} />
      </ul>,
    )
    expect(screen.getByText('@alice')).toBeInTheDocument()
  })

  it('renderiza un círculo de avatar con la inicial mayúscula del username', () => {
    render(
      <ul>
        <SessionPlayerRow player={player} />
      </ul>,
    )
    expect(screen.getByText('A', { selector: '[aria-hidden="true"]' })).toBeInTheDocument()
  })

  it('variante guest no renderiza avatar (solo texto)', () => {
    render(
      <ul>
        <SessionPlayerRow guestOf="cesarby" />
      </ul>,
    )
    expect(screen.queryByText('A', { selector: '[aria-hidden="true"]' })).not.toBeInTheDocument()
    expect(screen.getByText(/cesarby/i)).toBeInTheDocument()
  })
})
