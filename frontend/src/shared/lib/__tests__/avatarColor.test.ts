import { describe, expect, it } from 'vitest'

import { pickAvatarColor } from '../avatarColor'

describe('pickAvatarColor', () => {
  it('devuelve siempre el mismo color para el mismo username (determinístico)', () => {
    expect(pickAvatarColor('alice')).toBe(pickAvatarColor('alice'))
    expect(pickAvatarColor('bob')).toBe(pickAvatarColor('bob'))
  })

  it('devuelve una clase Tailwind válida de la paleta del proyecto', () => {
    const palette = [
      'bg-red',
      'bg-yellow',
      'bg-green',
      'bg-blue',
      'bg-foreground',
      'bg-muted-foreground',
    ]
    for (const name of ['alice', 'bob', 'cesarby', 'ana', 'pepe', 'x', 'zz']) {
      expect(palette).toContain(pickAvatarColor(name))
    }
  })

  it('devuelve un color por defecto para strings vacíos', () => {
    expect(pickAvatarColor('')).toMatch(/^bg-/)
  })

  it('distribuye razonablemente entre la paleta (no todos al mismo color)', () => {
    const colors = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map((n) => pickAvatarColor(n)),
    )
    expect(colors.size).toBeGreaterThan(1)
  })
})
