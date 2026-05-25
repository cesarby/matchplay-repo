import { useTranslation } from 'react-i18next'

import type { SessionStatus } from '@/features/sessions/types/session.types'
import { cn } from '@/shared/lib/cn'

const STATUS_CHIP: Record<SessionStatus, string> = {
  OPEN: 'bg-green-soft',
  FULL: 'bg-red-soft',
  IN_PROGRESS: 'bg-blue-soft',
  COMPLETED: 'bg-muted',
  CANCELLED: 'bg-muted',
}

interface SessionStatusBadgeProps {
  status: SessionStatus
  className?: string
}

/**
 * Píldora con el status de una partida.
 * Texto en {@code text-foreground} sobre soft → cumple AAA contraste.
 */
export function SessionStatusBadge({ status, className }: SessionStatusBadgeProps) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-foreground',
        STATUS_CHIP[status],
        className,
      )}
    >
      {t(`sessions.status.${status}`)}
    </span>
  )
}
