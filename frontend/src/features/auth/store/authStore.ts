import { create } from 'zustand'

import type { AuthStatus, CurrentUser } from '../types/auth.types'

interface AuthState {
  accessToken: string | null
  /** epoch ms */
  accessTokenExpiresAt: number | null
  currentUser: CurrentUser | null
  status: AuthStatus
}

interface AuthActions {
  setAuthenticated: (user: CurrentUser, token: string, expiresAt: number) => void
  setAccessToken: (token: string, expiresAt: number) => void
  setCurrentUser: (user: CurrentUser) => void
  clear: () => void
  markBooting: () => void
  markAnonymous: () => void
}

/**
 * Auth store en memoria, intencionalmente SIN persist.
 * El refresh token vive en cookie httpOnly del backend; el access se rehidrata
 * en cada boot llamando a POST /auth/refresh.
 */
export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  accessToken: null,
  accessTokenExpiresAt: null,
  currentUser: null,
  status: 'idle',
  setAuthenticated: (currentUser, accessToken, accessTokenExpiresAt) =>
    set({
      accessToken,
      accessTokenExpiresAt,
      currentUser,
      status: 'authenticated',
    }),
  setAccessToken: (accessToken, accessTokenExpiresAt) => set({ accessToken, accessTokenExpiresAt }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  clear: () =>
    set({
      accessToken: null,
      accessTokenExpiresAt: null,
      currentUser: null,
      status: 'anonymous',
    }),
  markBooting: () => set({ status: 'booting' }),
  markAnonymous: () => set({ status: 'anonymous' }),
}))

export const useIsAuthenticated = (): boolean => useAuthStore((s) => s.status === 'authenticated')

export const useCurrentUser = (): CurrentUser | null => useAuthStore((s) => s.currentUser)

export const useAuthStatus = (): AuthStatus => useAuthStore((s) => s.status)
