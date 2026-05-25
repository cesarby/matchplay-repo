import { useMutation } from '@tanstack/react-query'

import { authApi } from '../api/authApi'
import { authBroadcast } from '../lib/authBroadcast'
import { refreshScheduler } from '../lib/refreshScheduler'
import { useAuthStore } from '../store/authStore'
import type { AuthResponse, LoginPayload } from '../types/auth.types'

export function useLoginMutation() {
  return useMutation<AuthResponse, unknown, LoginPayload>({
    mutationFn: (body) => authApi.login(body),
    onSuccess: async (data) => {
      useAuthStore
        .getState()
        .setAccessToken(data.accessToken, Date.parse(data.accessTokenExpiresAt))
      const me = await authApi.me()
      useAuthStore
        .getState()
        .setAuthenticated(me, data.accessToken, Date.parse(data.accessTokenExpiresAt))
      refreshScheduler.schedule()
      authBroadcast.publish('login')
    },
  })
}
