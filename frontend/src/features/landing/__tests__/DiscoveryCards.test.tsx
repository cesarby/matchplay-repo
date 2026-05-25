import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { DiscoveryCards } from '../components/DiscoveryCards'

describe('<DiscoveryCards>', () => {
  it('renders the 3 discovery cards', () => {
    render(<DiscoveryCards />)
    // Verificar que hay 3 <article> elements
    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(3)
  })

  it('renders the section heading', () => {
    render(<DiscoveryCards />)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('each card has a heading', () => {
    render(<DiscoveryCards />)
    const h3s = screen.getAllByRole('heading', { level: 3 })
    expect(h3s).toHaveLength(3)
  })
})
