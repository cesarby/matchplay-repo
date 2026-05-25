import { beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '../store/authStore'
import type { CurrentUser } from '../types/auth.types'

const sampleUser: CurrentUser = {
  userId: 1,
  email: 'a@b.c',
  username: 'ana',
  role: 'USER',
  provinceCode: null,
  cityCode: null,
  areaCode: null,
  ratingAvg: 0,
  rewardPoints: 0,
  selectedAvatarCode: 'avatar_01',
}

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      accessTokenExpiresAt: null,
      currentUser: null,
      status: 'idle',
    })
  })

  it('starts in idle state', () => {
    expect(useAuthStore.getState().status).toBe('idle')
  })

  it('setAuthenticated sets status to authenticated', () => {
    useAuthStore.getState().setAuthenticated(sampleUser, 'tok', 12345)
    const state = useAuthStore.getState()
    expect(state.status).toBe('authenticated')
    expect(state.accessToken).toBe('tok')
    expect(state.accessTokenExpiresAt).toBe(12345)
    expect(state.currentUser).toEqual(sampleUser)
  })

  it('clear resets to anonymous', () => {
    useAuthStore.getState().setAuthenticated(sampleUser, 'tok', 1)
    useAuthStore.getState().clear()
    const state = useAuthStore.getState()
    expect(state.status).toBe('anonymous')
    expect(state.accessToken).toBeNull()
    expect(state.currentUser).toBeNull()
  })

  it('markBooting moves to booting', () => {
    useAuthStore.getState().markBooting()
    expect(useAuthStore.getState().status).toBe('booting')
  })

  it('setAccessToken updates token without touching user/status', () => {
    useAuthStore.getState().setAuthenticated(sampleUser, 'tok', 100)
    useAuthStore.getState().setAccessToken('tok2', 200)
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('tok2')
    expect(state.accessTokenExpiresAt).toBe(200)
    expect(state.currentUser).toEqual(sampleUser)
    expect(state.status).toBe('authenticated')
  })
})
