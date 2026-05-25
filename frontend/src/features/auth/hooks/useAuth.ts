import { useAuthStatus, useCurrentUser, useIsAuthenticated } from '../store/authStore'

export function useAuth() {
  return {
    status: useAuthStatus(),
    user: useCurrentUser(),
    isAuthenticated: useIsAuthenticated(),
  }
}
