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

/**
 * Detalle completo de un juego cacheado en el backend.
 * Devuelto por GET /api/v1/games/{bggId}.
 * El campo `summary` ya viene en el idioma de la request (Accept-Language).
 */
export interface GameDetail {
  bggId: number
  name: string
  yearPublished: number | null
  minPlayers: number | null
  maxPlayers: number | null
  playingTime: number | null
  thumbnailUrl: string | null
  imageUrl: string | null
  isExpansion: boolean
  baseGameBggId: number | null
  summary: string | null
}
