import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { JoinCallToAction } from '../components/JoinCallToAction'
import type { SessionDetail } from '../types/session.types'

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
    chatUnreadCount: null,
    chatMessageCount: 0,
    players: [],
    yourRole: null,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function renderCta(s: SessionDetail, isAuthenticated: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <JoinCallToAction session={s} isAuthenticated={isAuthenticated} />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('JoinCallToAction', () => {
  it('no renderiza nada si la sesión está cerrada', () => {
    const { container } = renderCta(baseSession({ status: 'COMPLETED' }), true)
    expect(container).toBeEmptyDOMElement()
  })

  it('no renderiza si soy participante (yourRole != null)', () => {
    const { container } = renderCta(baseSession({ yourRole: 'PLAYER' }), true)
    expect(container).toBeEmptyDOMElement()
  })

  it('no renderiza si no hay plazas libres (registered == max)', () => {
    const { container } = renderCta(baseSession({ registeredPlayers: 4, maxPlayers: 4 }), true)
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza CTA "Unirme" cuando autenticado y hay plaza', () => {
    renderCta(baseSession({ registeredPlayers: 2, maxPlayers: 4 }), true)
    expect(screen.getByRole('button', { name: /unirme/i })).toBeInTheDocument()
  })

  it('renderiza CTA "Inicia sesión" cuando anónimo y hay plaza', () => {
    renderCta(baseSession({ registeredPlayers: 2, maxPlayers: 4 }), false)
    expect(screen.getByRole('link', { name: /inicia sesión/i })).toBeInTheDocument()
  })
})
