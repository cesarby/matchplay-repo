import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/shared/lib/cn'

import type { SessionSummary } from '../types/session.types'

interface MyHistoryTableProps {
  rows: SessionSummary[]
}

/**
 * Tabla compacta para el tab Historial de Mis partidas.
 *
 * Calcada del mockup `docs/superpowers/brainstorm/.../historial-v2.html`.
 * Los hex literales (#F8F4EC, #8B7355, etc.) replican los valores exactos
 * del mockup en sitios donde el design system del proyecto (tokens cream/4-color)
 * no tiene equivalente directo — son específicos de esta vista historial.
 *
 * Estructura: header + filas de datos + sub-filas de expansiones, TODAS como
 * siblings directos del container (no anidadas). Esto permite que
 * `last:border-b-0` aplique al último elemento real de la tabla.
 *
 * Botón Duplicar navega a /sessions/new?from={id}; CreateSessionForm detecta
 * el query param y precarga el formulario.
 */
export function MyHistoryTable({ rows }: MyHistoryTableProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const dayFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timeFmt = new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  function formatScheduledAt(iso: string): string {
    const d = new Date(iso)
    return `${dayFmt.format(d)} ${timeFmt.format(d)}`
  }

  function statusLabel(status: SessionSummary['status']): string {
    if (status === 'CANCELLED') return t('sessions.mine.history.statusCancelled')
    return t('sessions.mine.history.statusCompleted')
  }

  function statusClass(status: SessionSummary['status']): string {
    return status === 'CANCELLED' ? 'text-[#B83838] font-medium' : 'text-[#0B5A3B] font-medium'
  }

  function handleDuplicate(id: number) {
    navigate(`/sessions/new?from=${id}`)
  }

  const gridCols = 'sm:grid-cols-[110px_1.4fr_1.2fr_1fr_90px_100px]'

  return (
    <div className="overflow-hidden rounded-md border border-border bg-white text-xs">
      {/* Header — mockup: bg #F8F4EC, text #8B7355, font-size 10px,
          uppercase, letter-spacing 0.5px, padding-top/bottom 11px. */}
      <div
        className={cn(
          'hidden grid-cols-[110px_1.4fr_1.2fr_1fr_90px_100px] gap-3',
          'border-b border-muted bg-[#F8F4EC] px-3.5 py-[11px]',
          'text-[10px] font-bold uppercase tracking-[0.5px] text-[#8B7355]',
          'sm:grid',
        )}
      >
        <span>{t('sessions.mine.history.columns.date')}</span>
        <span>{t('sessions.mine.history.columns.name')}</span>
        <span>{t('sessions.mine.history.columns.game')}</span>
        <span>{t('sessions.mine.history.columns.location')}</span>
        <span>{t('sessions.mine.history.columns.status')}</span>
        <span></span>
      </div>

      {rows.map((s) => {
        const hasExp = s.expansionNames != null && s.expansionNames.length > 0
        const location = [s.cityName, s.areaName].filter(Boolean).join(' · ') || '—'
        return (
          <Fragment key={s.id}>
            {/* Fila de datos — mockup: padding 10px 14px, border-bottom #F0EBE0
                (≈ border-muted en tokens), gap 12px. last:border-b-0 cubre el
                caso del último row sin sub-fila. */}
            <div
              className={cn(
                'grid grid-cols-1 gap-1.5 border-b border-muted px-3.5 py-2.5',
                gridCols,
                'last:border-b-0 sm:items-center sm:gap-3',
              )}
            >
              <span className="whitespace-nowrap text-foreground">
                {formatScheduledAt(s.scheduledAt)}
              </span>
              <span className="truncate font-semibold text-foreground" title={s.title}>
                {s.title}
              </span>
              <span className="truncate text-muted-foreground" title={s.baseGameName ?? ''}>
                {s.baseGameName ?? '—'}
              </span>
              <span className="truncate text-muted-foreground">{location}</span>
              <span className={statusClass(s.status)}>{statusLabel(s.status)}</span>
              <button
                type="button"
                onClick={() => handleDuplicate(s.id)}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-[#D14B4B] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:opacity-90"
              >
                <span aria-hidden="true">↻</span> {t('sessions.mine.history.duplicate')}
              </button>
            </div>

            {/* Sub-fila de expansiones — mockup: padding 2px 14px 10px, bg #FBF8F2,
                text #8B7355 italic, ↳ #B0A99A normal, strong #6B5535 normal. */}
            {hasExp && (
              <div
                className={cn(
                  'border-b border-muted bg-[#FBF8F2] px-3.5 pb-2.5 pt-0.5',
                  'text-[11px] italic text-[#8B7355]',
                  'last:border-b-0 sm:grid sm:grid-cols-[110px_1fr] sm:gap-3',
                )}
              >
                <span
                  aria-hidden="true"
                  className="hidden pr-1 text-right not-italic text-[#B0A99A] sm:block"
                >
                  ↳
                </span>
                <span className="truncate">
                  <strong className="mr-1.5 font-semibold not-italic text-[#6B5535]">
                    {t('sessions.mine.history.expansions')}
                  </strong>
                  {s.expansionNames!.join(', ')}
                </span>
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
