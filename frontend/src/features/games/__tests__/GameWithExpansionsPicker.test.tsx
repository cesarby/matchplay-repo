import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'

import { GameWithExpansionsPicker } from '../components/GameWithExpansionsPicker'
import type { GameSearchResult } from '../types/game.types'

const API = '/api/v1'

const CATAN: GameSearchResult = {
  bggId: 13,
  name: 'Catan',
  year: 1995,
  minPlayers: 3,
  maxPlayers: 4,
  minPlayTimeMinutes: 60,
  maxPlayTimeMinutes: 120,
  thumbnailUrl: null,
  imageUrl: null,
  isExpansion: false,
  hasExpansions: true,
  baseGameBggId: null,
}

const WINGSPAN: GameSearchResult = {
  ...CATAN,
  bggId: 77,
  name: 'Wingspan',
  hasExpansions: false,
}

const SEAFARERS: GameSearchResult = {
  bggId: 325,
  name: 'Catan: Seafarers',
  year: 1997,
  minPlayers: 3,
  maxPlayers: 4,
  minPlayTimeMinutes: 90,
  maxPlayTimeMinutes: 120,
  thumbnailUrl: null,
  imageUrl: null,
  isExpansion: true,
  hasExpansions: false,
  baseGameBggId: 13,
}

const CITIES: GameSearchResult = { ...SEAFARERS, bggId: 926, name: 'Catan: Cities & Knights' }

/** Wrapper que provee state controlado al picker (es controlled). */
function Harness({
  initialBase = null,
  initialExpansions = [],
}: {
  initialBase?: GameSearchResult | null
  initialExpansions?: GameSearchResult[]
}) {
  const [baseGame, setBaseGame] = useState<GameSearchResult | null>(initialBase)
  const [expansions, setExpansions] = useState<GameSearchResult[]>(initialExpansions)
  return (
    <GameWithExpansionsPicker
      baseGame={baseGame}
      onBaseGameChange={setBaseGame}
      expansions={expansions}
      onExpansionsChange={setExpansions}
      baseLabel="Juego"
      expansionsLabel="Expansiones"
      basePlaceholder="Buscar juego…"
      expansionPlaceholder="Buscar expansión…"
    />
  )
}

function renderPicker(props: Parameters<typeof Harness>[0] = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <Harness {...props} />
    </QueryClientProvider>,
  )
}

describe('<GameWithExpansionsPicker>', () => {
  it('shows only the base search when no base is selected', () => {
    renderPicker()
    expect(screen.getByLabelText('Juego')).toBeInTheDocument()
    expect(screen.queryByLabelText('Expansiones')).not.toBeInTheDocument()
  })

  it('replaces the input with a card after selecting a base with hasExpansions=true', async () => {
    server.use(
      http.get(`${API}/games`, () =>
        HttpResponse.json({
          content: [CATAN],
          page: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
          last: true,
        }),
      ),
    )
    const user = userEvent.setup()
    renderPicker()

    await user.type(screen.getByLabelText('Juego'), 'Catan')
    const opt = await screen.findByText('Catan', { selector: '.font-medium' })
    await user.click(opt)

    // El input desaparece, aparece la card
    expect(screen.queryByPlaceholderText('Buscar juego…')).not.toBeInTheDocument()
    expect(screen.getByText('Catan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quitar juego/i })).toBeInTheDocument()

    // Y aparece el bloque de expansiones porque hasExpansions=true
    await waitFor(() => expect(screen.getByLabelText('Expansiones')).toBeInTheDocument())
  })

  it('does NOT render the expansions section when hasExpansions=false', () => {
    renderPicker({ initialBase: WINGSPAN })
    expect(screen.queryByLabelText('Expansiones')).not.toBeInTheDocument()
  })

  it('removes the base via the X button and brings the input back', async () => {
    const user = userEvent.setup()
    renderPicker({ initialBase: CATAN, initialExpansions: [SEAFARERS] })

    await user.click(screen.getByRole('button', { name: /quitar juego/i }))

    // Reaparece el input de búsqueda
    expect(screen.getByLabelText('Juego')).toBeInTheDocument()
    // El bloque de expansiones desaparece (porque ya no hay base)
    expect(screen.queryByLabelText('Expansiones')).not.toBeInTheDocument()
    // El chip de Seafarers también
    expect(screen.queryByText('Catan: Seafarers')).not.toBeInTheDocument()
  })

  it('renders chips for already-added expansions and removes them via ×', async () => {
    server.use(
      http.get(`${API}/games`, () =>
        HttpResponse.json({
          content: [SEAFARERS, CITIES],
          page: 0,
          size: 50,
          totalElements: 2,
          totalPages: 1,
          last: true,
        }),
      ),
    )
    const user = userEvent.setup()
    renderPicker({ initialBase: CATAN, initialExpansions: [SEAFARERS] })

    // Chip visible
    expect(screen.getByText('Catan: Seafarers')).toBeInTheDocument()
    // Quitar via X
    await user.click(screen.getByRole('button', { name: /quitar catan: seafarers/i }))
    expect(screen.queryByText('Catan: Seafarers')).not.toBeInTheDocument()
  })

  it('adds an expansion by clicking it in the dropdown', async () => {
    server.use(
      http.get(`${API}/games`, () =>
        HttpResponse.json({
          content: [SEAFARERS, CITIES],
          page: 0,
          size: 50,
          totalElements: 2,
          totalPages: 1,
          last: true,
        }),
      ),
    )
    const user = userEvent.setup()
    renderPicker({ initialBase: CATAN })

    // Abrir dropdown (focus en el input de expansiones)
    await user.click(screen.getByLabelText('Expansiones'))

    const option = await screen.findByText('Catan: Seafarers', { selector: '.font-medium' })
    await user.click(option)

    // Chip aparece
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /quitar catan: seafarers/i })).toBeInTheDocument(),
    )
  })
})
