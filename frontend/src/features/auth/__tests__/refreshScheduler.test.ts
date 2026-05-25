import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { refreshScheduler } from '../lib/refreshScheduler'
import { useAuthStore } from '../store/authStore'

vi.mock('../api/authApi', () => ({
  authApi: {
    refresh: vi.fn().mockResolvedValue({
      accessToken: 'new-token',
      accessTokenExpiresAt: new Date(Date.now() + 1_000_000).toISOString(),
    }),
  },
}))

describe('refreshScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAuthStore.setState({
      accessToken: 'old-token',
      accessTokenExpiresAt: Date.now() + 120_000,
      currentUser: null,
      status: 'authenticated',
    })
  })

  afterEach(() => {
    refreshScheduler.cancel()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('schedules a refresh 60s before expiry', async () => {
    refreshScheduler.schedule()
    await vi.advanceTimersByTimeAsync(59_000)
    expect(useAuthStore.getState().accessToken).toBe('old-token')
    await vi.advanceTimersByTimeAsync(2_000)
    expect(useAuthStore.getState().accessToken).toBe('new-token')
  })

  it('cancel prevents the scheduled refresh from firing', async () => {
    refreshScheduler.schedule()
    refreshScheduler.cancel()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(useAuthStore.getState().accessToken).toBe('old-token')
  })

  it('does nothing when there is no expiration', () => {
    useAuthStore.setState({ accessTokenExpiresAt: null })
    expect(() => refreshScheduler.schedule()).not.toThrow()
  })
})
