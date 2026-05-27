import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import type { SessionSummary } from '@/features/sessions/types/session.types'

import { SessionCard } from '../SessionCard'

function renderCard(props: Partial<Parameters<typeof SessionCard>[0]> = {}) {
  const session: SessionSummary = {
    id: 42,
    title: 'Catan Night',
    baseGameId: 13,
    baseGameName: 'Catan',
    cityCode: 'MAD01',
    cityName: 'Madrid',
    areaCode: null,
    areaName: null,
    scheduledAt: '2030-01-15T20:00:00Z',
    maxPlayers: 4,
    registeredPlayers: 3,
    waitlistCount: 0,
    status: 'OPEN',
    creatorId: 1,
    creatorUsername: 'alice',
    baseGameThumbnailUrl: null,
    expansionCount: 0,
    expansionNames: null,
  }
  return render(
    <MemoryRouter>
      <SessionCard session={session} {...props} />
    </MemoryRouter>,
  )
}

describe('<SessionCard>', () => {
  it('renders title, game and location', () => {
    renderCard()
    expect(screen.getByText('Catan Night')).toBeInTheDocument()
    expect(screen.getByText('Catan')).toBeInTheDocument()
    expect(screen.getByText(/Madrid/)).toBeInTheDocument()
  })

  it('shows spots from registered/max', () => {
    renderCard()
    expect(screen.getByText(/3\s*\/\s*4/)).toBeInTheDocument()
  })

  it('shows waitlist count when session is full', () => {
    // El waitlistCount solo se muestra como "extra" cuando la partida está llena.
    renderCard({
      session: {
        ...buildSession(),
        registeredPlayers: 4,
        maxPlayers: 4,
        status: 'FULL',
        waitlistCount: 5,
      },
    })
    expect(screen.getByText(/5 en lista de espera/i)).toBeInTheDocument()
  })

  it('shows joined badge when yourRole is PLAYER', () => {
    renderCard({ yourRole: 'PLAYER' })
    // Texto del badge — en i18n es "Apuntado" (ES por defecto en tests)
    expect(screen.getByText(/Apuntado/i)).toBeInTheDocument()
  })

  it('shows waitlist badge with position when yourRole is WAITLIST', () => {
    renderCard({ yourRole: 'WAITLIST', yourPosition: 3 })
    expect(screen.getByText(/lista de espera \(#3\)/i)).toBeInTheDocument()
  })

  it('wraps content in a Link to /sessions/:id by default', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /Catan Night/ })
    expect(link).toHaveAttribute('href', '/sessions/42')
  })

  it('does NOT render a link when asStatic', () => {
    renderCard({ asStatic: true })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders organizer line', () => {
    renderCard()
    expect(screen.getByText(/alice/)).toBeInTheDocument()
  })
})

function buildSession(): SessionSummary {
  return {
    id: 42,
    title: 'Catan Night',
    baseGameId: 13,
    baseGameName: 'Catan',
    cityCode: 'MAD01',
    cityName: 'Madrid',
    areaCode: null,
    areaName: null,
    scheduledAt: '2030-01-15T20:00:00Z',
    maxPlayers: 4,
    registeredPlayers: 3,
    waitlistCount: 0,
    status: 'OPEN',
    creatorId: 1,
    creatorUsername: 'alice',
    baseGameThumbnailUrl: null,
    expansionCount: 0,
    expansionNames: null,
  }
}
