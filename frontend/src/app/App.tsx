import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { authApi } from '@/features/auth/api/authApi'
import { AuthBootSplash } from '@/features/auth/components/AuthBootSplash'
import { authBroadcast } from '@/features/auth/lib/authBroadcast'
import { refreshScheduler } from '@/features/auth/lib/refreshScheduler'
import { useAuthStatus, useAuthStore } from '@/features/auth/store/authStore'

import { router } from './router'

async function boot(): Promise<void> {
  const store = useAuthStore.getState()
  store.markBooting()
  try {
    const refreshed = await authApi.refresh()
    const expiresAt = Date.parse(refreshed.accessTokenExpiresAt)
    store.setAccessToken(refreshed.accessToken, expiresAt)
    try {
      const me = await authApi.me()
      store.setAuthenticated(me, refreshed.accessToken, expiresAt)
      refreshScheduler.schedule()
    } catch {
      store.clear()
    }
  } catch {
    store.markAnonymous()
  }
}

export function App() {
  const status = useAuthStatus()

  useEffect(() => {
    void boot()
    const unsubscribe = authBroadcast.subscribe((msg) => {
      if (msg.type === 'logout') {
        useAuthStore.getState().clear()
        refreshScheduler.cancel()
      } else if (msg.type === 'login' || msg.type === 'refreshed') {
        void boot()
      }
    })
    return () => {
      unsubscribe()
      refreshScheduler.cancel()
    }
  }, [])

  if (status === 'idle' || status === 'booting') {
    return <AuthBootSplash />
  }

  return <RouterProvider router={router} />
}
