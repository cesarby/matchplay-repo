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
}
