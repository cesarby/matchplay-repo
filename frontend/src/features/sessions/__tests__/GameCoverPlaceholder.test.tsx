import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GameCoverPlaceholder } from '../components/GameCoverPlaceholder'

describe('GameCoverPlaceholder', () => {
  it('renderiza el nombre del juego', () => {
    render(<GameCoverPlaceholder name="Ark Nova" />)
    expect(screen.getByText('Ark Nova')).toBeInTheDocument()
  })

  it('renderiza un icono decorativo accesible (aria-hidden)', () => {
    const { container } = render(<GameCoverPlaceholder name="Catan" />)
    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })

  it('aplica className extra cuando se pasa', () => {
    const { container } = render(<GameCoverPlaceholder name="Catan" className="extra" />)
    expect(container.firstChild).toHaveClass('extra')
  })
})
