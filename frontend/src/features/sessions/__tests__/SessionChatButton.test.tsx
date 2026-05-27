import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { describe, expect, it, vi } from 'vitest'

import { SessionChatButton } from '../components/SessionChatButton'
import type { SessionDetail } from '../types/session.types'

// Stub del drawer — los tests del drawer viven en su propio fichero.
vi.mock('../components/SessionChatDrawer', () => ({
  SessionChatDrawer: () => null,
}))

function baseSession(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: 7,
    title: 'Catan Night',
    description: null,
    baseGameId: 13,
    baseGameName: 'Catan',
    baseGameThumbnailUrl: null,
    baseGameSummary: null,
    expansions: [],
    creatorGuests: 0,
    cityCode: 'MAD01',
    cityName: 'Madrid',
    areaCode: null,
    areaName: null,
    scheduledAt: '2030-01-15T20:00:00Z',
    maxPlayers: 4,
    registeredPlayers: 2,
    waitlistCount: 0,
    status: 'OPEN',
    creatorId: 1,
    creatorUsername: 'alice',
    chatUnreadCount: 0,
    players: [],
    yourRole: 'PLAYER',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function renderButton(s: SessionDetail) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <SessionChatButton session={s} />
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('SessionChatButton', () => {
  it('no renderiza nada cuando chatUnreadCount es null (anónimo/no participante)', () => {
    const { container } = renderButton(baseSession({ chatUnreadCount: null }))
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza sin badge cuando chatUnreadCount es 0', () => {
    renderButton(baseSession({ chatUnreadCount: 0 }))
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('renderiza badge con N cuando chatUnreadCount > 0', () => {
    renderButton(baseSession({ chatUnreadCount: 5 }))
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
