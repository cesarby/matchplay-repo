import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { MyHistoryTable } from '../components/MyHistoryTable'
import type { SessionSummary } from '../types/session.types'

function row(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: 1,
    title: 'Ark Nova en casa',
    baseGameId: 100,
    baseGameName: 'Ark Nova',
    baseGameThumbnailUrl: null,
    expansionCount: 0,
    cityCode: 'MAD',
    cityName: 'Madrid',
    areaCode: 'CENTRO',
    areaName: 'Centro',
    scheduledAt: '2026-01-15T19:00:00Z',
    maxPlayers: 4,
    registeredPlayers: 2,
    waitlistCount: 0,
    status: 'COMPLETED',
    creatorId: 42,
    creatorUsername: 'me',
    ...overrides,
  }
}

function renderTable(rows: SessionSummary[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <MyHistoryTable rows={rows} />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('MyHistoryTable', () => {
  it('renderiza una fila por partida', () => {
    renderTable([row({ id: 1, title: 'Partida A' }), row({ id: 2, title: 'Partida B' })])
    expect(screen.getByText('Partida A')).toBeInTheDocument()
    expect(screen.getByText('Partida B')).toBeInTheDocument()
  })

  it('renderiza la fecha en formato d/MM/yyyy HH:mm', () => {
    renderTable([row({ scheduledAt: '2026-01-15T19:00:00Z' })])
    expect(screen.getByText(/\d{1,2}\/\d{2}\/2026 \d{2}:\d{2}/)).toBeInTheDocument()
  })

  it('renderiza sub-fila de expansiones solo cuando la partida las tiene', () => {
    renderTable([
      row({ id: 1, title: 'Con exp', expansionNames: ['Exp A', 'Exp B'] }),
      row({ id: 2, title: 'Sin exp' }),
      row({ id: 3, title: 'Lista vacía', expansionNames: [] }),
    ])
    expect(screen.getByText(/Exp A, Exp B/)).toBeInTheDocument()
    expect(screen.getAllByText(/Expansiones:/i)).toHaveLength(1)
  })

  it('estado COMPLETED se renderiza como "Completada"', () => {
    renderTable([row({ status: 'COMPLETED' })])
    expect(screen.getByText(/Completada/i)).toBeInTheDocument()
  })

  it('estado CANCELLED se renderiza como "Cancelada"', () => {
    renderTable([row({ status: 'CANCELLED' })])
    expect(screen.getByText(/Cancelada/i)).toBeInTheDocument()
  })

  it('click en Duplicar navega a /sessions/new?from={id}', async () => {
    let captured: string | null = null
    function LocationProbe() {
      const loc = useLocation()
      captured = loc.pathname + loc.search
      return null
    }
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <HelmetProvider>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={['/sessions/mine']}>
            <Routes>
              <Route path="/sessions/mine" element={<MyHistoryTable rows={[row({ id: 42 })]} />} />
              <Route path="/sessions/new" element={<LocationProbe />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: /duplicar/i }))
    expect(captured).toBe('/sessions/new?from=42')
  })
})
