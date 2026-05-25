import { httpClient } from '@/shared/api/httpClient'
import type { PageResponse } from '@/shared/api/PageResponse'

import type { GameSearchResult, GameSearchType } from '../types/game.types'

export interface GameSearchParams {
  q?: string
  type?: GameSearchType
  baseGameId?: number
  page?: number
  size?: number
}

export const gamesApi = {
  search: (params: GameSearchParams): Promise<PageResponse<GameSearchResult>> => {
    const query: Record<string, string> = {}
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      query[key] = String(value)
    }
    return httpClient
      .get<PageResponse<GameSearchResult>>('/games', { params: query })
      .then((r) => r.data)
  },
}
