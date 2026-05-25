import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'

import { authBroadcast } from './authBroadcast'

const LEAD_TIME_MS = 60_000

let timerId: ReturnType<typeof setTimeout> | null = null

export const refreshScheduler = {
  schedule(): void {
    this.cancel()
    const expiresAt = useAuthStore.getState().accessTokenExpiresAt
    if (!expiresAt) return
    const delay = Math.max(0, expiresAt - Date.now() - LEAD_TIME_MS)
    timerId = setTimeout(() => {
      void (async () => {
        try {
          const data = await authApi.refresh()
          useAuthStore
            .getState()
            .setAccessToken(data.accessToken, Date.parse(data.accessTokenExpiresAt))
          authBroadcast.publish('refreshed')
          refreshScheduler.schedule()
        } catch {
          // El interceptor reactivo gestiona el fallo si hay un request en vuelo.
        }
      })()
    }, delay)
  },
  cancel(): void {
    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
  },
}
