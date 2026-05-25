import { useQuery } from '@tanstack/react-query'

import { gamesApi, type GameSearchParams } from '../api/gamesApi'

/**
 * Búsqueda paginada de juegos contra BGG (vía cache backend).
 *
 * - {@code enabled} = solo cuando hay query con al menos 2 chars.
 *   Evita golpear BGG con cadenas cortas o vacías.
 * - {@code staleTime} alto: los resultados de BGG son estables.
 */
export function useGamesSearchQuery(params: GameSearchParams) {
  return useQuery({
    queryKey: ['games', 'search', params],
    queryFn: () => gamesApi.search(params),
    enabled: typeof params.q === 'string' && params.q.trim().length >= 2,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })
}
