import { useQuery } from '@tanstack/react-query'

import { statsApi } from '../api/statsApi'

export function usePublicStatsQuery() {
  return useQuery({
    queryKey: ['stats', 'public'],
    queryFn: () => statsApi.getPublic(),
    staleTime: 5 * 60_000, // 5 min — alineado con Cache-Control del backend
    gcTime: 30 * 60_000,
    retry: 0, // si falla, ocultamos el strip
  })
}
