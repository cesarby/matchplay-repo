export type Role = 'USER' | 'ADMIN' | 'SHOP'

export interface CurrentUser {
  userId: number
  email: string
  username: string
  role: Role
  ratingAvg: number
  rewardPoints: number
  selectedAvatarCode: string
}

export interface AuthResponse {
  userId: number
  email: string
  username: string
  role: Role
  accessToken: string
  /** ISO-8601 timestamp emitido por el backend. */
  accessTokenExpiresAt: string
}

export interface RefreshResponse {
  accessToken: string
  accessTokenExpiresAt: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  username: string
  password: string
  provinceCode: string
  cityCode: string
  areaCode: string
}

export type AuthStatus = 'idle' | 'booting' | 'authenticated' | 'anonymous'
