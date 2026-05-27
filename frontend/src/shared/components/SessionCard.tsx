import { MapPin, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type {
  ParticipantRole,
  SessionStatus,
  SessionSummary,
} from '@/features/sessions/types/session.types'
import { cn } from '@/shared/lib/cn'
import { relativeDateLabel } from '@/shared/lib/relativeDateLabel'

interface SessionCardProps {
  session: SessionSummary
  /** Rol del usuario actual respecto a la partida (si lo tiene). */
  yourRole?: ParticipantRole | null
  /** Posición en cola si {@code yourRole === 'WAITLIST'}. */
  yourPosition?: number | null
  /** Si true, no envuelve el contenido en un Link (uso decorativo / mock). */
  asStatic?: boolean
  /** Delay (ms) para animación fade-up secuencial en grids. */
  animationDelayMs?: number
  /**
   * Color del borde lateral izquierdo. Usado en Mis partidas para señalizar
   * el tab al que pertenece cada card (yellow=creadas, green=apuntado,
   * blue=waitlist, muted=historial). Sin valor → sin border-left.
   */
  accentColor?: 'yellow' | 'green' | 'blue' | 'muted'
  className?: string
}

// Strings literales (no template) para que Tailwind detecte las clases en build.
const ACCENT_CLASSES: Record<NonNullable<SessionCardProps['accentColor']>, string> = {
  yellow: 'border-l-4 border-yellow',
  green: 'border-l-4 border-green',
  blue: 'border-l-4 border-blue',
  muted: 'border-l-4 border-muted-foreground',
}

const STATUS_PILL: Record<SessionStatus, string> = {
  OPEN: 'bg-green text-white',
  FULL: 'bg-red text-white',
  IN_PROGRESS: 'bg-blue text-white',
  COMPLETED: 'bg-muted text-foreground',
  CANCELLED: 'bg-muted text-foreground',
}

const STATUS_LABEL_KEY: Record<SessionStatus, string> = {
  OPEN: 'sessions.status.OPEN',
  FULL: 'sessions.status.FULL',
  IN_PROGRESS: 'sessions.status.IN_PROGRESS',
  COMPLETED: 'sessions.status.COMPLETED',
  CANCELLED: 'sessions.status.CANCELLED',
}

const DATE_TONE: Record<'urgent' | 'warning' | 'info', string> = {
  urgent: 'bg-red text-white shadow-lg',
  warning: 'bg-yellow text-foreground shadow-lg',
  info: 'bg-blue-soft text-blue',
}

/**
 * Gradiente determinístico (por bggId) para usar como placeholder cuando el
 * juego no tiene thumbnail. Mismo juego → mismo color → consistencia visual.
 */
const FALLBACK_GRADIENTS = [
  'from-yellow-soft via-yellow to-red',
  'from-blue-soft via-blue to-foreground',
  'from-red-soft via-red to-foreground',
  'from-green-soft via-green to-blue',
  'from-yellow via-red to-foreground',
  'from-blue via-blue-soft to-yellow-soft',
] as const

function fallbackGradient(seed: number | null): string {
  const i = seed != null ? Math.abs(Number(seed)) % FALLBACK_GRADIENTS.length : 0
  return FALLBACK_GRADIENTS[i]!
}

/**
 * Card de partida con imagen del juego en top half, badges contextuales,
 * progress bar de plazas y animación fade-up. Pensada para listados;
 * para vistas pequeñas / mockups usar `asStatic`.
 */
export function SessionCard({
  session,
  yourRole = null,
  yourPosition = null,
  asStatic = false,
  animationDelayMs = 0,
  accentColor,
  className,
}: SessionCardProps) {
  const { t, i18n } = useTranslation()

  const date = relativeDateLabel(session.scheduledAt, i18n.language)
  const location = [session.cityName, session.areaName].filter(Boolean).join(' · ') || '—'

  const spotsRatio = session.maxPlayers > 0 ? session.registeredPlayers / session.maxPlayers : 0
  const spotsLeft = Math.max(0, session.maxPlayers - session.registeredPlayers)

  // Progress bar: rojo si llena · gradiente verde→amarillo si quedan pocas · verde si holgura
  const progressClass =
    session.status === 'FULL' || spotsLeft === 0
      ? 'bg-red'
      : spotsLeft <= 1
        ? 'bg-gradient-to-r from-green to-yellow'
        : 'bg-green'

  const spotsLine =
    session.status === 'FULL' || spotsLeft === 0
      ? {
          text: t('sessions.card.full'),
          extra:
            session.waitlistCount > 0
              ? t('sessions.card.waitlist', { count: session.waitlistCount })
              : null,
          tone: 'urgent' as const,
        }
      : {
          text: t('sessions.card.spotsLeft', { count: spotsLeft }),
          extra: null,
          tone: spotsLeft <= 1 ? ('warning' as const) : ('info' as const),
        }

  const spotsTextClass =
    spotsLine.tone === 'urgent'
      ? 'text-red'
      : spotsLine.tone === 'warning'
        ? 'text-yellow'
        : 'text-green'

  const youBadge =
    yourRole === 'PLAYER'
      ? { text: t('sessions.card.youArePlayer'), className: 'bg-green-soft text-foreground' }
      : yourRole === 'WAITLIST'
        ? {
            text: t('sessions.card.youAreWaitlist', { position: yourPosition ?? '?' }),
            className: 'bg-yellow-soft text-foreground',
          }
        : null

  const content = (
    <article
      style={animationDelayMs ? { animationDelay: `${animationDelayMs}ms` } : undefined}
      className={cn(
        'group relative animate-fade-up overflow-hidden rounded-3xl border border-border bg-card transition duration-300',
        !asStatic && 'hover:-translate-y-1 hover:border-red hover:shadow-hover',
        accentColor && ACCENT_CLASSES[accentColor],
        className,
      )}
    >
      {/* Top half: imagen del juego o fallback gradiente */}
      <div className="relative h-44 overflow-hidden">
        {session.baseGameThumbnailUrl ? (
          <img
            src={session.baseGameThumbnailUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              'absolute inset-0 bg-gradient-to-br transition duration-500 group-hover:scale-110',
              fallbackGradient(session.baseGameId),
            )}
          />
        )}
        {/* Overlay degradado: oculta partes inferiores de la imagen para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

        {/* Badges arriba: status + fecha contextual */}
        <div className="absolute inset-x-0 top-3 flex items-center justify-between gap-2 px-4">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
              STATUS_PILL[session.status],
            )}
          >
            {session.status === 'OPEN' && (
              <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-white" />
            )}
            {t(STATUS_LABEL_KEY[session.status])}
          </span>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider',
              DATE_TONE[date.tone],
            )}
          >
            {date.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="relative -mt-2 space-y-3 px-5 pb-5">
        {youBadge && (
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
              youBadge.className,
            )}
          >
            {youBadge.text}
          </span>
        )}

        <div>
          <h3 className="font-display text-2xl font-bold leading-tight text-foreground transition group-hover:text-red">
            {session.title}
          </h3>
          {session.baseGameName && (
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>{session.baseGameName}</span>
              {session.expansionCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-yellow-soft px-2 py-0.5 text-xs font-semibold text-yellow">
                  +{session.expansionCount}{' '}
                  {t('sessions.card.expansions', { count: session.expansionCount })}
                </span>
              )}
            </p>
          )}
        </div>

        <ul className="flex items-center gap-3 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <MapPin size={14} aria-hidden="true" className="shrink-0 text-green" />
            <span>{location}</span>
          </li>
          <li aria-hidden="true" className="text-border">
            ·
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users size={14} aria-hidden="true" className="shrink-0" />
            <span>
              {t('sessions.card.spots', {
                registered: session.registeredPlayers,
                max: session.maxPlayers,
              })}
            </span>
          </li>
        </ul>

        {/* Progress bar de plazas + microcopy */}
        <div className="space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all duration-700', progressClass)}
              style={{ width: `${Math.min(100, spotsRatio * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            <span className={cn('font-semibold', spotsTextClass)}>{spotsLine.text}</span>
            {spotsLine.extra && <span> · {spotsLine.extra}</span>}
            {session.creatorUsername && (
              <span className="text-muted-foreground/70">
                {' '}
                · {t('sessions.card.byCreator', { username: session.creatorUsername })}
              </span>
            )}
          </p>
        </div>
      </div>
    </article>
  )

  if (asStatic) return content
  return (
    <Link
      to={`/sessions/${session.id}`}
      aria-label={session.title}
      className="block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  )
}
