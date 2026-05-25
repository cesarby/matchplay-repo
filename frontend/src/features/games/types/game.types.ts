/**
 * Resultado de búsqueda en BGG cacheado en el backend.
 * Alineado con com.matchplay.game.dto.GameSearchResponse.
 */
export interface GameSearchResult {
  bggId: number
  name: string
  year: number | null
  minPlayers: number | null
  maxPlayers: number | null
  minPlayTimeMinutes: number | null
  maxPlayTimeMinutes: number | null
  thumbnailUrl: string | null
  imageUrl: string | null
  isExpansion: boolean
  hasExpansions: boolean
  baseGameBggId: number | null
}

export type GameSearchType = 'BASE' | 'EXPANSION'
