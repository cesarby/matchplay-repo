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
 * dividido en 4 tabs (CREATED / PLAYER / WAITLIST / HISTORY). El tab activo
 * y la página viven en query params (?tab=X&page=N). Anónimos redirigen
 * a /login con `?next=/sessions/mine`.
 *
 * Tabs: pills coloreadas (yellow/green/blue/muted) que muestran counts.
 * Body: grid de SessionCard con acentos del tab; tab HISTORY usa
 * MyHistoryTable (tabla compacta con botón Duplicar).
 */
export default function MySessionsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = parseTab(searchParams.get('tab'))
  const page = Math.max(0, Number.parseInt(searchParams.get('page') ?? '0', 10) || 0)

  // Hook se llama SIEMPRE para mantener el orden estable. El guard sólo
  // condiciona el render, no la llamada al hook. `enabled` evita el fetch
  // cuando el usuario no está autenticado.
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
      <div className="py-12 text-center">
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
        <div className="space-y-3 p-4">
          <div className="h-24 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded bg-muted" />
        </div>
      )
    }
    if (isError) {
      return (
        <div className="py-12 text-center">
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
      return (
        <div className="p-4">
          <MyHistoryTable rows={items} />
        </div>
      )
    }

    const accent = ACCENT_BY_TAB[tab]
    return (
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s, i) => (
          <SessionCard key={s.id} session={s} accentColor={accent} animationDelayMs={i * 60} />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl py-6">
      <SeoHead
        title={`${t('sessions.mine.title')} | Match&Play`}
        description={t('sessions.mine.title')}
        noindex
      />
      <h1 className="mb-4 px-4 font-display text-2xl font-bold sm:px-6 sm:text-3xl">
        {t('sessions.mine.title')}
      </h1>
      <MySessionsTabs active={tab} counts={counts} onChange={changeTab} />
      {renderContent()}
      {data && data.items.totalPages > 1 && (
        <div className="mt-4 px-4">
          <Pagination
            page={data.items.page}
            totalPages={data.items.totalPages}
            onPageChange={changePage}
          />
        </div>
      )}
    </div>
  )
}
