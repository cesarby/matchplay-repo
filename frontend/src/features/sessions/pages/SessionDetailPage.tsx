import { Calendar, MapPin, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { SeoHead } from '@/shared/components/SeoHead'
import { SessionStatusBadge } from '@/shared/components/SessionStatusBadge'

import { CreatorActions } from '../components/CreatorActions'
import { GameCover } from '../components/GameCover'
import { JoinCallToAction } from '../components/JoinCallToAction'
import { SessionActions } from '../components/SessionActions'
import { SessionChatButton } from '../components/SessionChatButton'
import { SessionExpansionsBlock } from '../components/SessionExpansionsBlock'
import { SessionPlayerRow } from '../components/SessionPlayerRow'
import { useSessionDetailQuery } from '../hooks/useSessions'

/**
 * Página `/sessions/:id` — detalle público de una partida (layout editorial v3).
 *
 * Estructura:
 * - Header 2-col (≥sm): GameCover izq + título/badges/meta dcha. Mobile: stacked.
 * - CTA "Unirme" prominente bajo header (solo mobile, solo cuando aplica).
 * - Cuerpo: "Sobre el juego" → Expansiones → Descripción → (mobile: sidebar abajo).
 * - Sidebar (sm+): Apuntados, Lista de espera, Chat, Acciones — cada uno mini-card.
 */
export default function SessionDetailPage() {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated } = useAuth()
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

  const isCreator = !!user && user.username === data.creatorUsername
  const canEdit = isCreator && (data.status === 'OPEN' || data.status === 'FULL')

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

      {/* Header 2-col en sm+: cover izq + meta dcha. Mobile: stacked centrado. */}
      <header className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr] sm:gap-6">
        <div className="mx-auto w-36 sm:mx-0 sm:w-40">
          <GameCover thumbnailUrl={data.baseGameThumbnailUrl} name={data.baseGameName ?? ''} />
        </div>

        <div className="flex flex-col gap-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <SessionStatusBadge status={data.status} />
            {youBadge && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-foreground ${youBadge.className}`}
              >
                {youBadge.text}
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {data.title}
          </h1>
          {data.baseGameName && (
            <p className="text-sm italic text-muted-foreground">{data.baseGameName}</p>
          )}
          {data.creatorUsername && (
            <p className="text-xs text-muted-foreground">
              {t('sessions.card.byCreator', { username: data.creatorUsername })}
            </p>
          )}

          {/* Meta vertical con iconos coloreados */}
          <ul className="mt-2 space-y-2 border-t border-border pt-3 text-sm sm:text-left">
            <li className="flex items-center justify-center gap-2 sm:justify-start">
              <Calendar size={16} aria-hidden="true" className="shrink-0 text-blue" />
              <time dateTime={data.scheduledAt}>{scheduled}</time>
            </li>
            <li className="flex items-center justify-center gap-2 sm:justify-start">
              <MapPin size={16} aria-hidden="true" className="shrink-0 text-green" />
              <span>{location}</span>
            </li>
            <li className="flex items-center justify-center gap-2 sm:justify-start">
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

          {canEdit && <CreatorActions session={data} />}
        </div>
      </header>

      {/* CTA mobile prominente — solo si aplica */}
      <JoinCallToAction session={data} isAuthenticated={isAuthenticated} />

      {/* Cuerpo 2-col en lg+, single col en mobile/tablet */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          {/* Sobre el juego */}
          {data.baseGameSummary?.trim() && data.baseGameName && (
            <section
              aria-labelledby="game-summary-heading"
              className="rounded border-l-4 border-yellow bg-yellow-soft/30 p-4"
            >
              <h2
                id="game-summary-heading"
                className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"
              >
                {t('sessions.detail.aboutGameHeading', { game: data.baseGameName })}
              </h2>
              <p className="text-sm italic leading-relaxed text-foreground">
                {data.baseGameSummary}
              </p>
            </section>
          )}

          <SessionExpansionsBlock expansions={data.expansions} />

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

        {/* Sidebar: cada bloque en su propia mini-card */}
        <aside className="space-y-3">
          <section
            aria-labelledby="players-heading"
            className="rounded border border-border bg-card p-4"
          >
            <h2
              id="players-heading"
              className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              <span>{t('sessions.detail.playersHeading')}</span>
              <span className="font-normal">
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

          <section
            aria-labelledby="waitlist-heading"
            className="rounded border border-border bg-card p-4"
          >
            <h2
              id="waitlist-heading"
              className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              <span>{t('sessions.detail.waitlistHeading')}</span>
              <span className="font-normal">{waitlist.length}</span>
            </h2>
            {waitlist.length > 0 ? (
              <ul className="space-y-2">
                {waitlist.map((p) => (
                  <SessionPlayerRow key={p.userId} player={p} showPosition />
                ))}
              </ul>
            ) : null}
          </section>

          <SessionChatButton session={data} />

          <div className="border-t border-border pt-4">
            <SessionActions session={data} />
          </div>
        </aside>
      </div>
    </div>
  )
}
