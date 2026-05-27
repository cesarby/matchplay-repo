import { useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Pagination } from '@/shared/components/Pagination'
import { SeoHead } from '@/shared/components/SeoHead'
import { SessionCard } from '@/shared/components/SessionCard'

import { MyHistoryTable } from '../components/MyHistoryTable'
import { MySessionsTabs } from '../components/MySessionsTabs'
import { useMySessionsQuery } from '../hooks/useMySessions'
import type { MyTab } from '../types/session.types'

const VALID_TABS: MyTab[] = ['CREATED', 'PLAYER', 'WAITLIST', 'HISTORY']

function parseTab(raw: string | null): MyTab {
  return raw && (VALID_TABS as string[]).includes(raw) ? (raw as MyTab) : 'CREATED'
}

const ACCENT_BY_TAB: Record<MyTab, 'yellow' | 'green' | 'blue' | 'muted'> = {
  CREATED: 'yellow',
  PLAYER: 'green',
  WAITLIST: 'blue',
  HISTORY: 'muted',
}

/**
 * Página `/sessions/mine` — listado de partidas del usuario logueado
 * dividido en 4 tabs (CREATED / PLAYER / WAITLIST / HISTORY).
 *
 * Layout calcado del mockup `historial-v2.html` Nivel 1 (`.mp-mockup`):
 * card unificada con bg warm cream (#FAF7F2), border-radius 12px, overflow
 * hidden y shadow suave envolviendo título + tabs + contenido. Las tabs
 * tienen bg white para cortar el cream y crear jerarquía visual; el
 * contenido (tabla o grid) lleva margin interno simulando el padding
 * `16px 24px` de `.history-table`.
 *
 * Tab activo y página viven en query params (?tab=X&page=N). Anónimos
 * redirigen a /login con ?next=/sessions/mine.
 */
export default function MySessionsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = parseTab(searchParams.get('tab'))
  const page = Math.max(0, Number.parseInt(searchParams.get('page') ?? '0', 10) || 0)

  // Hook se llama SIEMPRE para mantener el orden estable. El guard sólo
  // condiciona el render, no la llamada al hook.
  const queryResult = useMySessionsQuery(tab, page)

  if (!isAuthenticated) {
    return <Navigate to="/login?next=/sessions/mine" replace />
  }

  const { data, isLoading, isError, refetch } = queryResult

  function changeTab(next: MyTab) {
    setSearchParams({ tab: next }, { replace: false })
  }

  function changePage(next: number) {
    setSearchParams({ tab, page: String(next) }, { replace: false })
  }

  const counts = data?.counts ?? { created: 0, player: 0, waitlist: 0, history: 0 }
  const items = data?.items.content ?? []

  function renderEmpty() {
    const map = {
      CREATED: {
        msgKey: 'sessions.mine.empty.created',
        ctaKey: 'sessions.mine.empty.createdCta',
        to: '/sessions/new',
      },
      PLAYER: {
        msgKey: 'sessions.mine.empty.player',
        ctaKey: 'sessions.mine.empty.playerCta',
        to: '/sessions',
      },
      WAITLIST: {
        msgKey: 'sessions.mine.empty.waitlist',
        ctaKey: 'sessions.mine.empty.waitlistCta',
        to: '/sessions',
      },
      HISTORY: {
        msgKey: 'sessions.mine.empty.history',
        ctaKey: null as string | null,
        to: null as string | null,
      },
    } as const
    const cfg = map[tab]
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-muted-foreground">{t(cfg.msgKey)}</p>
        {cfg.ctaKey && cfg.to && (
          <Link
            to={cfg.to}
            className="mt-4 inline-block rounded-md bg-red px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            {t(cfg.ctaKey)}
          </Link>
        )}
      </div>
    )
  }

  function renderContent() {
    if (isLoading) {
      return (
        <div className="space-y-3 px-6 py-4">
          <div className="h-24 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded bg-muted" />
        </div>
      )
    }
    if (isError) {
      return (
        <div className="px-6 py-12 text-center">
          <p className="text-muted-foreground">{t('common.error')}</p>
          <button
            type="button"
            onClick={() => {
              void refetch()
            }}
            className="mt-4 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold"
          >
            {t('common.retry')}
          </button>
        </div>
      )
    }
    if (items.length === 0) return renderEmpty()

    if (tab === 'HISTORY') {
      // Padding 16px 24px replica el `margin: 16px 24px` de .history-table.
      return (
        <div className="px-6 py-4">
          <MyHistoryTable rows={items} />
        </div>
      )
    }

    const accent = ACCENT_BY_TAB[tab]
    return (
      <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s, i) => (
          <SessionCard key={s.id} session={s} accentColor={accent} animationDelayMs={i * 60} />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <SeoHead
        title={`${t('sessions.mine.title')} | Match&Play`}
        description={t('sessions.mine.title')}
        noindex
      />
      {/* Outer card .mp-mockup — bg #FAF7F2 (warm cream), radius 12px,
          overflow-hidden, shadow 0 6px 20px rgba(0,0,0,0.08). */}
      <div className="overflow-hidden rounded-xl bg-[#FAF7F2] shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
        {/* Título — padding 20px 24px 0 (sin bottom padding, el siguiente
            bloque controla su separación). */}
        <div className="px-6 pt-5">
          <h1 className="m-0 font-display text-2xl font-bold leading-tight">
            {t('sessions.mine.title')}
          </h1>
        </div>
        <MySessionsTabs active={tab} counts={counts} onChange={changeTab} />
        {renderContent()}
        {data && data.items.totalPages > 1 && (
          <div className="px-6 pb-4">
            <Pagination
              page={data.items.page}
              totalPages={data.items.totalPages}
              onPageChange={changePage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
