export interface FavoriteGameSummary {
  bggId: number
  name: string
  thumbnailUrl: string | null
}

export interface UserProfile {
  username: string
  email: string
  avatarCode: string | null
  bio: string | null
  favoriteGames: FavoriteGameSummary[]
  provinceCode: string | null
  cityCode: string | null
  areaCode: string | null
}

export interface UpdateProfilePayload {
  avatarCode?: string
  bio?: string
  favoriteGameBggIds?: number[]
  provinceCode?: string
  cityCode?: string
  areaCode?: string
  /**
   * Solo para uso interno del optimistic update en `useUpdateProfileMutation`.
   * Permite que `onMutate` pueble el cache con la lista completa (name +
   * thumbnailUrl) sin esperar al server. Se filtra antes del PATCH para no
   * mandarlo al backend.
   */
  _favoriteGamesOptimistic?: FavoriteGameSummary[]
}
