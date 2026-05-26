import { useQuery } from '@tanstack/react-query'

import { gamesApi, type GameSearchParams } from '../api/gamesApi'

/**
 * Búsqueda paginada de juegos contra BGG (vía cache backend).
 *
 * Gating de {@code enabled}:
 *  - {@code type='BASE'} (default): requiere {@code q} con ≥ 2 caracteres
 *    no-espacio. Evita golpear BGG con cadenas cortas.
 *  - {@code type='EXPANSION'}: requiere {@code baseGameId}. {@code q} es
 *    opcional (el backend ignora {@code q} en este modo y devuelve todas
 *    las expansiones del base).
 *
 * {@code staleTime} alto: los resultados de BGG son estables.
 */
export function useGamesSearchQuery(params: GameSearchParams) {
  const hasQuery = typeof params.q === 'string' && params.q.trim().length >= 2
  const isExpansionWithBase = params.type === 'EXPANSION' && params.baseGameId != null
  return useQuery({
    queryKey: ['games', 'search', params],
    queryFn: () => gamesApi.search(params),
    enabled: isExpansionWithBase || hasQuery,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })
}
