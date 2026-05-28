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
}

export interface UpdateProfilePayload {
  avatarCode?: string
  bio?: string
  favoriteGameBggIds?: number[]
}
