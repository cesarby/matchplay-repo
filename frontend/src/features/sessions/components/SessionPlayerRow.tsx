import type { SessionPlayer } from '../types/session.types'

interface SessionPlayerRowProps {
  player: SessionPlayer
  /** Si true, prefija un "#N" con la posición en cola (solo WAITLIST). */
  showPosition?: boolean
}

/**
 * Fila de un jugador apuntado.
 * Mismo layout para PLAYER y WAITLIST — diferenciación visual la pone el padre.
 */
export function SessionPlayerRow({ player, showPosition = false }: SessionPlayerRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-3">
        {showPosition && player.position != null && (
          <span
            aria-label={`Posición ${player.position}`}
            className="inline-flex size-7 items-center justify-center rounded-full bg-yellow-soft text-xs font-bold text-foreground"
          >
            {player.position}
          </span>
        )}
        <div className="leading-tight">
          <p className="text-sm font-medium text-foreground">{player.name}</p>
          <p className="text-xs text-muted-foreground">@{player.username}</p>
        </div>
      </div>
    </li>
  )
}
