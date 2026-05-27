import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { HelmetProvider } from 'react-helmet-async'
import { beforeEach, describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'

import { SessionExpansionsBlock } from '../components/SessionExpansionsBlock'

const API = '/api/v1'

function renderBlock(expansions: { bggId: number; name: string; thumbnailUrl: string | null }[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <SessionExpansionsBlock expansions={expansions} />
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('SessionExpansionsBlock', () => {
  beforeEach(() => {
    // No extra setup needed — MSW and i18n are initialized in global setup.ts
  })

  it('omite el bloque si no hay expansiones', () => {
    const { container } = renderBlock([])
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza una fila por expansión con su nombre', () => {
    renderBlock([
      { bggId: 1, name: 'Marine Worlds', thumbnailUrl: null },
      { bggId: 2, name: 'Promo Pack', thumbnailUrl: null },
    ])
    expect(screen.getByText('Marine Worlds')).toBeInTheDocument()
    expect(screen.getByText('Promo Pack')).toBeInTheDocument()
    expect(screen.getByText(/expansiones \(2\)/i)).toBeInTheDocument()
  })

  it('al hacer click carga y muestra el summary de la expansión', async () => {
    server.use(
      http.get(`${API}/games/1`, () =>
        HttpResponse.json({
          bggId: 1,
          name: 'Marine Worlds',
          yearPublished: 2022,
          minPlayers: 1,
          maxPlayers: 4,
          playingTime: 120,
          thumbnailUrl: null,
          imageUrl: null,
          isExpansion: true,
          baseGameBggId: 99,
          summary: 'Añade hábitats marinos al zoo.',
        }),
      ),
    )
    renderBlock([{ bggId: 1, name: 'Marine Worlds', thumbnailUrl: null }])

    const button = screen.getByRole('button', { name: /marine worlds/i })
    await userEvent.click(button)

    expect(await screen.findByText(/hábitats marinos/i)).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('si el endpoint falla muestra mensaje de error', async () => {
    server.use(http.get(`${API}/games/1`, () => HttpResponse.json({}, { status: 500 })))
    renderBlock([{ bggId: 1, name: 'Marine Worlds', thumbnailUrl: null }])

    await userEvent.click(screen.getByRole('button', { name: /marine worlds/i }))

    await waitFor(() => expect(screen.getByText(/no se ha podido cargar/i)).toBeInTheDocument())
  })

  it('al hacer click en una segunda expansión, la primera se cierra', async () => {
    server.use(
      http.get(`${API}/games/:id`, ({ params }) =>
        HttpResponse.json({
          bggId: Number(params.id),
          name: `Game ${params.id}`,
          yearPublished: null,
          minPlayers: null,
          maxPlayers: null,
          playingTime: null,
          thumbnailUrl: null,
          imageUrl: null,
          isExpansion: true,
          baseGameBggId: 99,
          summary: `Summary of ${params.id}`,
        }),
      ),
    )
    renderBlock([
      { bggId: 1, name: 'First', thumbnailUrl: null },
      { bggId: 2, name: 'Second', thumbnailUrl: null },
    ])

    await userEvent.click(screen.getByRole('button', { name: /first/i }))
    expect(await screen.findByText(/summary of 1/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /second/i }))
    expect(await screen.findByText(/summary of 2/i)).toBeInTheDocument()
    expect(screen.queryByText(/summary of 1/i)).not.toBeInTheDocument()

    const firstBtn = screen.getByRole('button', { name: /first/i })
    expect(firstBtn).toHaveAttribute('aria-expanded', 'false')

    const secondBtn = screen.getByRole('button', { name: /second/i })
    expect(secondBtn).toHaveAttribute('aria-expanded', 'true')
  })
})
