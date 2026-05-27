import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GameCover } from '../components/GameCover'

describe('GameCover', () => {
  it('renderiza img cuando hay thumbnailUrl', () => {
    render(<GameCover thumbnailUrl="https://example.com/cover.jpg" name="Catan" />)
    const img = screen.getByRole('img', { name: 'Catan' })
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg')
  })

  it('renderiza placeholder cuando thumbnailUrl es null', () => {
    render(<GameCover thumbnailUrl={null} name="Catan" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Catan')).toBeInTheDocument()
  })
})
