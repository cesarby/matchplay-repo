import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar } from '../Avatar'

describe('Avatar', () => {
  it('renderiza la inicial coloreada cuando no hay avatarCode', () => {
    render(<Avatar username="alice" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renderiza inicial cuando avatarCode no corresponde a ningún PNG', () => {
    render(<Avatar username="bob" avatarCode="avatar_99" />)
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('renderiza la imagen cuando el avatarCode es válido', () => {
    render(<Avatar username="alice" avatarCode="avatar_07" />)
    const img = screen.getByRole('img', { name: 'alice' })
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src')
  })

  it('aplica el tamaño en píxeles', () => {
    render(<Avatar username="alice" avatarCode="avatar_07" size={48} />)
    const img = screen.getByRole('img', { name: 'alice' })
    expect(img).toHaveAttribute('width', '48')
    expect(img).toHaveAttribute('height', '48')
  })
})
