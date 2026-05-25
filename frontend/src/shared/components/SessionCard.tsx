import { Calendar, MapPin, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type {
  ParticipantRole,
  SessionStatus,
  SessionSummary,
} from '@/features/sessions/types/session.types'
import { cn } from '@/shared/lib/cn'

interface SessionCardProps {
  session: SessionSummary
  /** Rol del usuario actual respecto a la partida (si lo tiene). */
  yourRole?: ParticipantRole | null
  /** Posición en cola si {@code yourRole === 'WAITLIST'}. */
  yourPosition?: number | null
  /** Si true se renderiza como <article> sin <Link> (uso decorativo / mock). */
  asStatic?: boolean
  className?: string
}

/** Mapeo status → color semántico de la cinta lateral. */
const STATUS_ACCENT: Record<SessionStatus, string> = {
  OPEN: 'border-green',
  FULL: 'border-red',
  IN_PROGRESS: 'border-blue',
  COMPLETED: 'border-muted-foreground/40',
  CANCELLED: 'border-muted-foreground/30',
}

/** Chip background por status, usado en el badge superior. */
const STATUS_CHIP: Record<SessionStatus, string> = {
  OPEN: 'bg-green-soft',
  FULL: 'bg-red-soft',
  IN_PROGRESS: 'bg-blue-soft',
  COMPLETED: 'bg-muted',
  CANCELLED: 'bg-muted',
}

const DATE_FORMATTER: Record<string, Intl.DateTimeFormat> = {}

function formatDate(iso: string, locale: string): string {
  if (!DATE_FORMATTER[locale]) {
    DATE_FORMATTER[locale] = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return DATE_FORMATTER[locale].format(new Date(iso))
}

/**
 * Card reutilizable para mostrar una sesión.
 *
 * - Cinta lateral coloreada según status (semántica fija del proyecto).
 * - Plazas: "3/4". Si hay waitlist se muestra debajo.
 * - Si el usuario está apuntado, se indica con un pill ("Apuntado" o
 *   "En lista de espera #N").
 * - Click → navega a /sessions/:id salvo que {@code asStatic}.
 */
export function SessionCard({
  session,
  yourRole = null,
  yourPosition = null,
  asStatic = false,
  className,
}: SessionCardProps) {
  const { t, i18n } = useTranslation()

  const accent = STATUS_ACCENT[session.status]
  const chip = STATUS_CHIP[session.status]

  const date = formatDate(session.scheduledAt, i18n.language)
  const location = [session.cityName, session.areaName].filter(Boolean).join(' · ') || '—'

  const youBadge =
    yourRole === 'PLAYER'
      ? { text: t('sessions.card.youArePlayer'), className: 'bg-green-soft' }
      : yourRole === 'WAITLIST'
        ? {
            text: t('sessions.card.youAreWaitlist', { position: yourPosition ?? '?' }),
            className: 'bg-yellow-soft',
          }
        : null

  const content = (
    <article
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden rounded border-l-[6px] bg-card p-4 shadow-[var(--shadow)] transition-shadow duration-200',
        !asStatic && 'hover:shadow-[var(--shadow-hover)]',
        accent,
        className,
      )}
    >
      {/* Header: status chip + youBadge */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold text-foreground', chip)}
        >
          {t(`sessions.status.${session.status}`)}
        </span>
        {youBadge && (
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold text-foreground',
              youBadge.className,
            )}
          >
            {youBadge.text}
          </span>
        )}
      </div>

      {/* Título + juego */}
      <div>
        <h3 className="font-display text-lg font-bold leading-tight text-foreground">
          {session.title}
        </h3>
        {session.baseGameName && (
          <p className="mt-0.5 text-sm text-muted-foreground">{session.baseGameName}</p>
        )}
      </div>

      {/* Meta: fecha + ubicación + plazas */}
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <Calendar size={14} aria-hidden="true" className="shrink-0" />
          <time dateTime={session.scheduledAt}>{date}</time>
        </li>
        <li className="flex items-center gap-2">
          <MapPin size={14} aria-hidden="true" className="shrink-0" />
          <span>{location}</span>
        </li>
        <li className="flex items-center gap-2">
          <Users size={14} aria-hidden="true" className="shrink-0" />
          <span>
            {t('sessions.card.spots', {
              registered: session.registeredPlayers,
              max: session.maxPlayers,
            })}
          </span>
          {session.waitlistCount > 0 && (
            <span className="text-xs text-muted-foreground">
              · {t('sessions.card.waitlist', { count: session.waitlistCount })}
            </span>
          )}
        </li>
      </ul>

      {/* Footer: organizador */}
      {session.creatorUsername && (
        <p className="text-xs text-muted-foreground">
          {t('sessions.card.byCreator', { username: session.creatorUsername })}
        </p>
      )}
    </article>
  )

  if (asStatic) return content
  return (
    <Link
      to={`/sessions/${session.id}`}
      aria-label={session.title}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  )
}
