// Types del módulo sessions — alineados con el backend (DTOs Java).
// Evitar drift: cualquier cambio de shape va sincronizado.

export type SessionStatus = 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type ParticipantRole = 'PLAYER' | 'WAITLIST'

/** Vista compacta de una expansión asociada a una partida (DTO ExpansionSummary). */
export interface ExpansionSummary {
  bggId: number
  name: string
  thumbnailUrl: string | null
}

/** Resumen compacto usado en listados / cards. */
export interface SessionSummary {
  id: number
  title: string
  baseGameId: number | null
  baseGameName: string | null
  /** Thumbnail BGG. Nullable si BGG no aportó imagen. */
  baseGameThumbnailUrl: string | null
  /** Nº de expansiones asociadas a la partida (0..N). Solo el conteo en listados. */
  expansionCount: number
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

/** Mensaje del chat de coordinación de una partida. */
export interface SessionMessage {
  id: number
  userId: number
  username: string
  content: string
  createdAt: string // ISO Instant
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
export interface SessionDetail extends Omit<
  SessionSummary,
  'creatorId' | 'creatorUsername' | 'expansionCount'
> {
  description: string | null
  /** Resumen editorial del juego base generado por LLM. Null si no se ha generado todavía. */
  baseGameSummary: string | null
  /** Lista detallada de expansiones asociadas (orden de inserción). */
  expansions: ExpansionSummary[]
  /** Personas adicionales declaradas por el creador. Cuenta dentro de registeredPlayers. */
  creatorGuests: number
  creatorId: number | null
  creatorUsername: string | null
  /**
   * Mensajes no leídos en el chat de esta partida.
   * null si el caller es anónimo o no participa (chat invisible).
   * 0 si está al día o el chat está cerrado.
   */
  chatUnreadCount: number | null
  /**
   * Total de mensajes en el chat de esta partida, visible a cualquier visitante.
   * null si la sesión es terminal (CANCELLED/COMPLETED) — bloque del chat no aplica.
   */
  chatMessageCount: number | null
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
  /** bggIds de expansiones (0..20). Vacío/omitido → sin expansiones. */
  expansionBggIds?: number[]
  cityCode: string
  areaCode?: string | null
  scheduledAt: string // ISO Instant
  maxPlayers: number
  /**
   * Personas adicionales que el creador trae consigo (no usuarios del
   * sistema). Cuenta para la capacidad. Default 0 si se omite.
   */
  creatorGuests?: number
}

export interface UpdateSessionRequest {
  title?: string | null
  description?: string | null
  areaCode?: string | null
  scheduledAt?: string | null
  maxPlayers?: number | null
  /**
   * PATCH semantics:
   *  - omitido / null → no se toca la lista actual.
   *  - [] → vacía la lista.
   *  - [a, b, ...] → reemplaza completamente la lista.
   */
  expansionBggIds?: number[] | null
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
