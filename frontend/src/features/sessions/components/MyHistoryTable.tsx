import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/shared/lib/cn'

import type { SessionSummary } from '../types/session.types'

interface MyHistoryTableProps {
  rows: SessionSummary[]
}

/**
 * Tabla compacta para el tab Historial de Mis partidas. Layout calcado del
 * mockup `docs/superpowers/brainstorm/.../historial-v2.html`:
 *
 * - Contenedor: border + radius + bg-card (cream casi blanco), overflow hidden.
 * - Header: bg-muted/30 ≈ #FAF6EF (mockup #F8F4EC), uppercase 10px tracking-wider.
 * - Body row: padding 10px 14px (py-2.5 px-3.5), border-bottom 1px border-muted
 *   ≈ #F0EAE0 (mockup #F0EBE0).
 * - Sub-fila de expansiones: padding 2px 14px 10px (pt-0.5 pb-2.5 px-3.5),
 *   bg-muted/15 ≈ #FCF9F2 (mockup #FBF8F2), border-bottom propio para crear
 *   la línea de separación con la siguiente sesión.
 *
 * Botón Duplicar navega a /sessions/new?from={id}; CreateSessionPage detecta
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
    return status === 'CANCELLED' ? 'text-red font-medium' : 'text-green font-medium'
  }

  function handleDuplicate(id: number) {
    navigate(`/sessions/new?from=${id}`)
  }

  return (
    <div className="overflow-hidden rounded-md border border-muted bg-card">
      {/* Cabecera — solo visible en sm+. */}
      <div className="hidden grid-cols-[110px_1.4fr_1.2fr_1fr_90px_100px] gap-3 border-b border-muted bg-muted/30 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid">
        <span>{t('sessions.mine.history.columns.date')}</span>
        <span>{t('sessions.mine.history.columns.name')}</span>
        <span>{t('sessions.mine.history.columns.game')}</span>
        <span>{t('sessions.mine.history.columns.location')}</span>
        <span>{t('sessions.mine.history.columns.status')}</span>
        <span></span>
      </div>

      {rows.map((s, idx) => {
        const hasExp = s.expansionNames != null && s.expansionNames.length > 0
        const location = [s.cityName, s.areaName].filter(Boolean).join(' · ') || '—'
        const isLast = idx === rows.length - 1
        return (
          <div key={s.id}>
            {/* Fila principal. border-bottom separa de la sub-fila o de la
                siguiente sesión. La última fila de la última sesión sin
                sub-fila no lleva borde. */}
            <div
              className={cn(
                'grid grid-cols-1 gap-1.5 border-b border-muted px-3.5 py-2.5 text-xs sm:grid-cols-[110px_1.4fr_1.2fr_1fr_90px_100px] sm:items-center sm:gap-3',
                isLast && !hasExp && 'border-b-0',
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
                className="inline-flex items-center justify-center gap-1 rounded-md bg-red px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:opacity-90"
              >
                <span aria-hidden="true">↻</span> {t('sessions.mine.history.duplicate')}
              </button>
            </div>

            {/* Sub-fila de expansiones — bg-muted/15 ≈ mockup #FBF8F2, border-bottom
                propio para separar de la siguiente sesión. */}
            {hasExp && (
              <div
                className={cn(
                  'border-b border-muted bg-muted/15 px-3.5 pb-2.5 pt-0.5 text-[11px] italic text-muted-foreground',
                  'sm:grid sm:grid-cols-[110px_1fr] sm:gap-3',
                  isLast && 'border-b-0',
                )}
              >
                <span
                  aria-hidden="true"
                  className="hidden pr-1 text-right not-italic text-muted-foreground/50 sm:block"
                >
                  ↳
                </span>
                <span className="truncate">
                  <strong className="mr-1.5 font-semibold not-italic text-foreground/80">
                    {t('sessions.mine.history.expansions')}
                  </strong>
                  {s.expansionNames!.join(', ')}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
