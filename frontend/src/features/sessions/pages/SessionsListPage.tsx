import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Pagination } from '@/shared/components/Pagination'
import { SeoHead } from '@/shared/components/SeoHead'
import { SessionCard } from '@/shared/components/SessionCard'
import { useUrlFilters } from '@/shared/hooks/useUrlFilters'

import { SessionFilters } from '../components/SessionFilters'
import { useSessionsQuery } from '../hooks/useSessions'
import type { SessionSearchParams, SessionStatus } from '../types/session.types'

const DEFAULT_PAGE_SIZE = 20

type UrlState = {
  provinceCode?: string
  cityCode?: string
  status?: string
  page?: string
} & Record<string, string | undefined>

/**
 * Página `/sessions` — listado público con filtros y paginación.
 *
 * Estado de filtros en URL → compartible y permite deep-link desde
 * el QuickSearch de la landing.
 *
 * - URL params soportados: provinceCode, cityCode, status, page
 * - Listado paginado (page 0-indexed, size = 20 fijo en v1)
 * - Filtros: provincia, ciudad, estado
 * - "Crear partida" solo si autenticado
 */
export default function SessionsListPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { filters, setFilters, clearFilters } = useUrlFilters<UrlState>()

  const page = parseIntSafe(filters.page, 0)
  const status = isSessionStatus(filters.status) ? filters.status : undefined

  const searchParams: SessionSearchParams = {
    provinceCode: filters.provinceCode,
    cityCode: filters.cityCode,
    status,
    page,
    size: DEFAULT_PAGE_SIZE,
  }

  const { data, isLoading, isError, refetch } = useSessionsQuery(searchParams)

  return (
    <div className="container py-8">
      <SeoHead
        title={`${t('sessions.list.title')} | Matchplay`}
        description={t('sessions.list.title')}
        canonical="/sessions"
      />

      {/* Header */}
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-foreground">
          {t('sessions.list.title')}
        </h1>

        {isAuthenticated && (
          <Link
            to="/sessions/new"
            className="inline-flex items-center gap-2 rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus size={16} aria-hidden="true" />
            {t('sessions.create.title')}
          </Link>
        )}
      </header>

      {/* Filters */}
      <div className="mb-6">
        <SessionFilters
          value={{
            provinceCode: filters.provinceCode,
            cityCode: filters.cityCode,
            status,
          }}
          onChange={(patch) => {
            // Cualquier cambio de filtro vuelve a la primera página
            setFilters({ ...patch, page: undefined })
          }}
          onClear={() => clearFilters()}
        />
      </div>

      {/* Contenido */}
      {isLoading && <SkeletonGrid />}

      {isError && (
        <ErrorState
          onRetry={() => {
            void refetch()
          }}
        />
      )}

      {data && data.content.length === 0 && <EmptyState message={t('sessions.list.empty')} />}

      {data && data.content.length > 0 && (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.content.map((session) => (
              <li key={session.id}>
                <SessionCard session={session} />
              </li>
            ))}
          </ul>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(p) => setFilters({ page: p === 0 ? undefined : String(p) })}
          />
        </>
      )}
    </div>
  )
}

// ---------- helpers UI ----------

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="h-48 animate-pulse rounded border border-border bg-muted"
          aria-hidden="true"
        />
      ))}
    </ul>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="rounded border border-dashed border-border bg-card p-12 text-center text-muted-foreground"
    >
      {message}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      className="rounded border border-red bg-red-soft p-6 text-center text-foreground"
    >
      <p className="mb-3">{t('common.error')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        {t('common.retry')}
      </button>
    </div>
  )
}

// ---------- helpers ----------

function parseIntSafe(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

const SESSION_STATUSES: SessionStatus[] = ['OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

function isSessionStatus(value: string | undefined): value is SessionStatus {
  return typeof value === 'string' && (SESSION_STATUSES as string[]).includes(value)
}
