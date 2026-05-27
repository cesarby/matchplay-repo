import { Dices, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { GameSearchResult } from '@/features/games/types/game.types'
import { SessionCard } from '@/shared/components/SessionCard'

import type { SessionSummary } from '../types/session.types'

interface SessionLivePreviewProps {
  title?: string
  baseGame?: GameSearchResult | null
  expansionCount: number
  cityName?: string
  areaName?: string
  /** datetime-local string ("YYYY-MM-DDTHH:mm") o vacío. */
  scheduledAt?: string
  maxPlayers: number
  creatorGuests: number
  creator?: { userId: number; username: string } | null
  isPending?: boolean
}

/**
 * Construye una {@link SessionSummary} en tiempo real desde el estado del
 * form y la renderiza con {@link SessionCard} (en modo estático).
 *
 * <p>El usuario ve exactamente cómo aparecerá su partida en el listado
 * público mientras la rellena. Reduce sorpresas y refuerza marca.</p>
 *
 * <p>Empty-states: si no hay título / juego / ubicación / fecha, se
 * muestran placeholders neutros para que la card nunca se vea rota.</p>
 */
export function SessionLivePreview({
  title,
  baseGame,
  expansionCount,
  cityName,
  areaName,
  scheduledAt,
  maxPlayers,
  creatorGuests,
  creator,
  isPending = false,
}: SessionLivePreviewProps) {
  const { t } = useTranslation()

  const registeredPlayers = 1 + creatorGuests
  const spotsLeft = Math.max(0, maxPlayers - registeredPlayers)

  // Si no hay fecha, pasamos una string inválida — relativeDateLabel
  // devuelve "—" en ese caso, sin romper.
  const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : 'pending'

  const previewSession: SessionSummary = {
    id: -1,
    title: title?.trim() || t('sessions.create.preview.placeholderTitle'),
    baseGameId: baseGame?.bggId ?? null,
    baseGameName: baseGame?.name ?? t('sessions.create.preview.placeholderGame'),
    baseGameThumbnailUrl: baseGame?.thumbnailUrl ?? null,
    expansionCount,
    expansionNames: null,
    cityCode: null,
    cityName: cityName ?? null,
    areaCode: null,
    areaName: areaName ?? null,
    scheduledAt: scheduledIso,
    maxPlayers,
    registeredPlayers,
    waitlistCount: 0,
    status: 'OPEN',
    creatorId: creator?.userId ?? null,
    creatorUsername: creator?.username ?? null,
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {t('sessions.create.preview.heading')}
      </div>

      <SessionCard session={previewSession} yourRole="PLAYER" asStatic />

      {/* Publish bar — es el submit del form */}
      <button
        type="submit"
        disabled={isPending}
        className="group flex items-center justify-between rounded-3xl bg-red px-5 py-4 text-left text-white shadow-hover transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-80"
      >
        <div>
          <div className="text-xs uppercase tracking-wider opacity-80">
            {t('sessions.create.publishReady')}
          </div>
          <div className="mt-0.5 font-display text-lg font-bold">
            {isPending ? t('sessions.create.submitting') : t('sessions.create.submit')}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold">
          <Dices size={16} aria-hidden="true" />
          {t('sessions.create.publishCta')}
        </span>
      </button>

      <div className="flex items-start gap-2 rounded-xl bg-blue-soft p-3 text-xs text-blue">
        <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>{t('sessions.create.publishHint', { count: spotsLeft })}</span>
      </div>
    </div>
  )
}
