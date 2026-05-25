import { describe, expect, it } from 'vitest'

import { cn } from '../cn'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('handles conditionals', () => {
    expect(cn('p-2', false && 'p-4', 'bg-red')).toBe('p-2 bg-red')
  })
})
