import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/features/auth/store/authStore'
import { useLocaleStore } from '@/shared/store/localeStore'

import { normalizeApiError } from './ApiError'

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const AUTH_PATHS = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout']

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false
  return AUTH_PATHS.some((p) => url.includes(p))
}

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

httpClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  config.headers.set('Accept-Language', useLocaleStore.getState().locale)
  return config
})

interface RefreshResponseBody {
  accessToken: string
  accessTokenExpiresAt: string
}

let pendingRefresh: Promise<RefreshResponseBody | null> | null = null

async function performRefresh(): Promise<RefreshResponseBody | null> {
  pendingRefresh ??= httpClient
    .post<RefreshResponseBody>('/auth/refresh')
    .then((r) => r.data)
    .catch(() => null)
    .finally(() => {
      pendingRefresh = null
    })
  return pendingRefresh
}

async function handleAuthFailure(originalError: AxiosError): Promise<never> {
  const { useAuthStore: store } = await import('@/features/auth/store/authStore')
  const { refreshScheduler } = await import('@/features/auth/lib/refreshScheduler')
  const { authBroadcast } = await import('@/features/auth/lib/authBroadcast')
  store.getState().clear()
  refreshScheduler.cancel()
  authBroadcast.publish('logout')
  if (typeof window !== 'undefined') {
    const from = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.assign(`/login?reason=session-expired&from=${from}`)
  }
  throw normalizeApiError(originalError)
}

httpClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true
      const data = await performRefresh()
      if (data) {
        const { refreshScheduler } = await import('@/features/auth/lib/refreshScheduler')
        useAuthStore
          .getState()
          .setAccessToken(data.accessToken, Date.parse(data.accessTokenExpiresAt))
        refreshScheduler.schedule()
        original.headers.set('Authorization', `Bearer ${data.accessToken}`)
        return httpClient(original)
      }
      return handleAuthFailure(error)
    }
    return Promise.reject(normalizeApiError(error))
  },
)
