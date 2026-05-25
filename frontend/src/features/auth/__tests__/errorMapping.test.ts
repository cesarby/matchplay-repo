import { describe, expect, it } from 'vitest'

import { mapAuthError } from '../lib/errorMapping'

describe('mapAuthError', () => {
  it('maps invalid credentials to a banner', () => {
    const m = mapAuthError({ status: 401, code: 'error.auth.invalid.credentials', message: '' })
    expect(m.channel).toBe('banner')
    expect(m.i18nKey).toBe('auth.errors.invalidCredentials')
  })

  it('maps email duplicate to email field', () => {
    const m = mapAuthError({ status: 409, code: 'error.auth.email.duplicate', message: '' })
    expect(m.channel).toBe('field')
    if (m.channel === 'field') expect(m.field).toBe('email')
  })

  it('falls back to generic banner for unknown codes', () => {
    const m = mapAuthError({ status: 500, code: 'error.unknown.code', message: '' })
    expect(m.channel).toBe('banner')
    expect(m.i18nKey).toBe('auth.errors.generic')
  })
})
