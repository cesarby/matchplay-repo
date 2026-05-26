import { Calendar, MapPin, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'

import { SeoHead } from '@/shared/components/SeoHead'
import { SessionStatusBadge } from '@/shared/components/SessionStatusBadge'

import { SessionActions } from '../components/SessionActions'
import { SessionPlayerRow } from '../components/SessionPlayerRow'
import { useSessionDetailQuery } from '../hooks/useSessions'

/**
 * Página `/sessions/:id` — detalle público de una partida.
 *
 * - Estados: loading (skeleton) · 404 → Navigate a NotFound · error → mensaje genérico
 * - Header con título, juego, badge de status, badge "Apuntado" / "En cola" si aplica
 * - Meta (fecha, ubicación, plazas)
 * - Descripción si la hay
 * - Lista de PLAYERS y, en sección aparte, WAITLIST
 * - Acciones contextuales en sticky bottom bar (delegado a SessionActions)
 */
export default function SessionDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const sessionId = id ? Number.parseInt(id, 10) : Number.NaN

  const { data, isLoading, isError, error } = useSessionDetailQuery(
    Number.isFinite(sessionId) ? sessionId : undefined,
  )

  if (!Number.isFinite(sessionId)) {
    return <Navigate to="/sessions" replace />
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-8 h-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    // Distinguir 404 de error genérico via ApiError.status si está disponible
    const status = (error as { status?: number } | null)?.status
    if (status === 404) {
      return (
        <div className="container py-12 text-center">
          <SeoHead title="Match&Play" description={t('sessions.errors.notFound')} noindex />
          <p className="text-muted-foreground">{t('sessions.errors.notFound')}</p>
        </div>
      )
    }
    return (
      <div className="container py-12 text-center" role="alert">
        <p className="text-muted-foreground">{t('common.error')}</p>
      </div>
    )
  }

  const creatorUsername = data.creatorUsername
  const players = data.players.filter((p) => p.role === 'PLAYER')
  const waitlist = data.players
    .filter((p) => p.role === 'WAITLIST')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'full',
    timeStyle: 'short',
  })
  const scheduled = dateFormatter.format(new Date(data.scheduledAt))
  const location = [data.cityName, data.areaName].filter(Boolean).join(' · ') || '—'

  const youBadge =
    data.yourRole === 'PLAYER'
      ? { text: t('sessions.card.youArePlayer'), className: 'bg-green-soft' }
      : data.yourRole === 'WAITLIST'
        ? {
            // Posición del usuario en la cola
            text: t('sessions.card.youAreWaitlist', {
              position:
                data.players.find((p) => p.role === 'WAITLIST' && data.yourRole === 'WAITLIST')
                  ?.position ?? '?',
            }),
            className: 'bg-yellow-soft',
          }
        : null

  return (
    <div className="container py-8">
      <SeoHead
        title={`${data.title} | Match&Play`}
        description={data.description ?? data.title}
        canonical={`/sessions/${data.id}`}
      />

      {/* Header */}
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SessionStatusBadge status={data.status} />
          {youBadge && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-foreground ${youBadge.className}`}
            >
              {youBadge.text}
            </span>
          )}
        </div>

        <h1 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
          {data.title}
        </h1>
        {data.baseGameName && (
          <p className="mt-1 text-lg text-muted-foreground">{data.baseGameName}</p>
        )}
        {data.creatorUsername && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('sessions.card.byCreator', { username: data.creatorUsername })}
          </p>
        )}
      </header>

      {/* Layout 2 columnas en desktop */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        {/* Columna principal */}
        <div className="space-y-8">
          {/* Meta */}
          <section
            aria-label="Información de la partida"
            className="rounded border border-border bg-card p-4"
          >
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Calendar size={16} aria-hidden="true" className="shrink-0 text-blue" />
                <time dateTime={data.scheduledAt}>{scheduled}</time>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} aria-hidden="true" className="shrink-0 text-green" />
                <span>{location}</span>
              </li>
              <li className="flex items-center gap-2">
                <Users size={16} aria-hidden="true" className="shrink-0 text-red" />
                <span>
                  {t('sessions.card.spots', {
                    registered: data.registeredPlayers,
                    max: data.maxPlayers,
                  })}
                </span>
                {data.waitlistCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    · {t('sessions.card.waitlist', { count: data.waitlistCount })}
                  </span>
                )}
              </li>
            </ul>
          </section>

          {/* Descripción */}
          <section aria-labelledby="desc-heading">
            <h2 id="desc-heading" className="mb-2 font-display text-lg font-bold text-foreground">
              {t('sessions.detail.descriptionHeading')}
            </h2>
            {data.description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {data.description}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                {t('sessions.detail.noDescription')}
              </p>
            )}
          </section>
        </div>

        {/* Sidebar: jugadores + waitlist + acciones */}
        <aside className="space-y-6">
          {/* Players */}
          <section aria-labelledby="players-heading">
            <h2
              id="players-heading"
              className="mb-3 flex items-center justify-between font-display text-lg font-bold text-foreground"
            >
              <span>{t('sessions.detail.playersHeading')}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {data.registeredPlayers}/{data.maxPlayers}
              </span>
            </h2>
            {players.length > 0 || data.creatorGuests > 0 ? (
              <ul className="space-y-2">
                {players.map((p) => (
                  <SessionPlayerRow key={p.userId} player={p} />
                ))}
                {data.creatorGuests > 0 &&
                  creatorUsername &&
                  Array.from({ length: data.creatorGuests }).map((_, idx) => (
                    <SessionPlayerRow key={`guest-${idx}`} guestOf={creatorUsername} />
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </section>

          {/* Waitlist */}
          {waitlist.length > 0 && (
            <section aria-labelledby="waitlist-heading">
              <h2
                id="waitlist-heading"
                className="mb-3 flex items-center justify-between font-display text-lg font-bold text-foreground"
              >
                <span>{t('sessions.detail.waitlistHeading')}</span>
                <span className="text-sm font-normal text-muted-foreground">{waitlist.length}</span>
              </h2>
              <ul className="space-y-2">
                {waitlist.map((p) => (
                  <SessionPlayerRow key={p.userId} player={p} showPosition />
                ))}
              </ul>
            </section>
          )}

          {/* Acciones */}
          <div className="border-t border-border pt-6">
            <SessionActions session={data} />
          </div>
        </aside>
      </div>
    </div>
  )
}
