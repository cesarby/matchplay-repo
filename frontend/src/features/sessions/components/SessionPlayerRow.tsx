import { useTranslation } from 'react-i18next'

import type { SessionPlayer } from '../types/session.types'

interface SessionPlayerRowProps {
  player: SessionPlayer
  /** Si true, prefija un "#N" con la posición en cola (solo WAITLIST). */
  showPosition?: boolean
  /** Si se pasa, esta fila representa un acompañante del creador (no es un usuario real). */
  guestOf?: string
}

/**
 * Fila de un jugador apuntado. Si `guestOf` está informado, la fila se renderiza
 * como acompañante (sin enlace a perfil, estilo muted).
 */
export function SessionPlayerRow({ player, showPosition = false, guestOf }: SessionPlayerRowProps) {
  const { t } = useTranslation()
  if (guestOf) {
    return (
      <li className="flex items-center justify-between gap-3 rounded border border-dashed border-border bg-muted/30 px-3 py-2">
        <p className="text-sm italic text-muted-foreground">
          {t('sessions.detail.guestOf', { username: guestOf })}
        </p>
      </li>
    )
  }
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
        <p className="text-sm font-medium text-foreground">@{player.username}</p>
      </div>
    </li>
  )
}
