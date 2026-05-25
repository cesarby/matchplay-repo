// Types del módulo sessions — alineados con el backend (DTOs Java).
// Evitar drift: cualquier cambio de shape va sincronizado.

export type SessionStatus = 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type ParticipantRole = 'PLAYER' | 'WAITLIST'

/** Resumen compacto usado en listados / cards. */
export interface SessionSummary {
  id: number
  title: string
  baseGameId: number | null
  baseGameName: string | null
  /** Thumbnail BGG. Nullable si BGG no aportó imagen. */
  baseGameThumbnailUrl: string | null
  cityCode: string | null
  cityName: string | null
  areaCode: string | null
  areaName: string | null
  scheduledAt: string // ISO Instant
  maxPlayers: number
  registeredPlayers: number
  waitlistCount: number
  status: SessionStatus
  creatorId: number | null
  creatorUsername: string | null
}

/** Participante (jugador o waitlist) tal como lo serializa el backend. */
export interface SessionPlayer {
  userId: number
  username: string
  role: ParticipantRole
  position: number | null // FIFO en cola; null para PLAYER
  joinedAt: string
}

/** Detalle completo de una partida. */
export interface SessionDetail extends Omit<SessionSummary, 'creatorId' | 'creatorUsername'> {
  description: string | null
  creatorId: number | null
  creatorUsername: string | null
  players: SessionPlayer[]
  yourRole: ParticipantRole | null // null si anónimo o no apuntado
  createdAt: string
  updatedAt: string
}

// ---------- Request payloads ----------

export interface CreateSessionRequest {
  title: string
  description?: string | null
  baseGameId: number
  cityCode: string
  areaCode?: string | null
  scheduledAt: string // ISO Instant
  maxPlayers: number
}

export interface UpdateSessionRequest {
  title?: string | null
  description?: string | null
  areaCode?: string | null
  scheduledAt?: string | null
  maxPlayers?: number | null
}

export interface ChangeStatusRequest {
  status: SessionStatus
}

// ---------- Search ----------

export interface SessionSearchParams {
  provinceCode?: string
  cityCode?: string
  areaCode?: string
  gameId?: number
  scheduledFrom?: string
  scheduledTo?: string
  status?: SessionStatus
  page?: number
  size?: number
}
