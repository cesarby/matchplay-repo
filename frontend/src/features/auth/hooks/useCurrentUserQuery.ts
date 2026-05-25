import { useQuery } from '@tanstack/react-query'

import { authApi } from '../api/authApi'
import { useIsAuthenticated } from '../store/authStore'

export function useCurrentUserQuery() {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}
