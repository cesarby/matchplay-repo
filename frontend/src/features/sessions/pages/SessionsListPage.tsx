import { Dices, Plus, Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Pagination } from '@/shared/components/Pagination'
import { SeoHead } from '@/shared/components/SeoHead'
import { SessionCard } from '@/shared/components/SessionCard'
import { useUrlFilters } from '@/shared/hooks/useUrlFilters'

import { SessionFilters } from '../components/SessionFilters'
import { useSessionsQuery } from '../hooks/useSessions'
import type { SessionSearchParams } from '../types/session.types'

const DEFAULT_PAGE_SIZE = 20

type UrlState = {
  provinceCode?: string
  cityCode?: string
  areaCode?: string
  page?: string
} & Record<string, string | undefined>

/**
 * Página `/sessions` — listado público con filtros y paginación.
 *
 * - URL params: provinceCode, cityCode, areaCode, page (deep-linkable)
 * - Pre-fill de filtros con la ubicación del user al primer mount
 * - Hero compacto con eyebrow + H1 + CTA contextual (auth vs anónimo)
 * - Grid de SessionCard con fade-up secuencial
 * - Empty state ilustrado · banda CTA para anónimos al final del listado
 */
export default function SessionsListPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const { filters, setFilters, clearFilters } = useUrlFilters<UrlState>()

  // Pre-fill ubicación del user solo en el primer mount.
  const didAutoFill = useRef(false)
  useEffect(() => {
    if (didAutoFill.current) return
    didAutoFill.current = true
    if (!user) return
    if (filters.provinceCode || filters.cityCode || filters.areaCode) return
    if (!user.provinceCode && !user.cityCode && !user.areaCode) return
    setFilters({
      provinceCode: user.provinceCode ?? undefined,
      cityCode: user.cityCode ?? undefined,
      areaCode: user.areaCode ?? undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId])

  // Al hacer logout, limpiar filtros + paginación para que el listado no
  // se quede mostrando "Madrid · Centro" del user anterior.
  const wasAuthenticated = useRef(isAuthenticated)
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      didAutoFill.current = false
      clearFilters()
    }
    wasAuthenticated.current = isAuthenticated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const page = parseIntSafe(filters.page, 0)

  const searchParams: SessionSearchParams = {
    provinceCode: filters.provinceCode,
    cityCode: filters.cityCode,
    areaCode: filters.areaCode,
    page,
    size: DEFAULT_PAGE_SIZE,
  }

  const { data, isLoading, isError, refetch } = useSessionsQuery(searchParams)
  const totalCount = data?.totalElements ?? 0
  const hasData = data && data.content.length > 0

  return (
    <div>
      <SeoHead
        title={`${t('sessions.list.title')} | Matchplay`}
        description={t('sessions.list.title')}
        canonical="/sessions"
      />

      {/* HERO con decoración */}
      <section className="relative overflow-hidden border-b border-border bg-muted">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 top-1/2 size-72 -translate-y-1/2 rotate-12 rounded-3xl bg-red opacity-[0.08]" />
          <div className="absolute -bottom-12 right-1/3 size-32 -rotate-12 rounded-2xl bg-yellow opacity-[0.12]" />
          <div className="absolute left-12 top-12 grid grid-cols-3 gap-2 opacity-25">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="size-2 rounded-full bg-foreground" />
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0 flex-1">
              {data && (
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red">
                  {t('sessions.list.heroEyebrow', { count: totalCount })}
                </p>
              )}
              <h1 className="font-display text-5xl font-bold leading-[0.95] text-foreground lg:text-6xl">
                <Trans
                  i18nKey={
                    isAuthenticated ? 'sessions.list.heroTitleAuth' : 'sessions.list.heroTitleAnon'
                  }
                  components={{ 1: <span className="text-red" /> }}
                />
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                {t(
                  isAuthenticated
                    ? 'sessions.list.heroSubtitleAuth'
                    : 'sessions.list.heroSubtitleAnon',
                )}
              </p>
            </div>

            {isAuthenticated && (
              <Link
                to="/sessions/new"
                className="inline-flex animate-pulse-soft items-center gap-2 rounded-full bg-red px-6 py-3.5 text-sm font-bold text-white transition hover:scale-105"
              >
                <Plus size={18} aria-hidden="true" />
                {t('sessions.create.title')}
              </Link>
            )}
          </div>

          {/* Filtros */}
          <div className="mt-8">
            <SessionFilters
              value={{
                provinceCode: filters.provinceCode,
                cityCode: filters.cityCode,
                areaCode: filters.areaCode,
              }}
              onChange={(patch) => setFilters({ ...patch, page: undefined })}
              onClear={() => clearFilters()}
            />
          </div>

          {/* Hint anónimo: tip amistoso, NO requisito */}
          {!isAuthenticated && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles size={14} aria-hidden="true" className="shrink-0 text-yellow" />
              <Trans
                i18nKey="sessions.list.anonHint"
                components={{
                  1: (
                    <Link
                      to="/login"
                      className="font-semibold text-blue underline-offset-2 hover:underline"
                    />
                  ),
                }}
              />
            </p>
          )}
        </div>
      </section>

      {/* LISTADO */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        {isLoading && <SkeletonGrid />}

        {isError && (
          <ErrorState
            onRetry={() => {
              void refetch()
            }}
          />
        )}

        {data && data.content.length === 0 && <EmptyState isAuthenticated={isAuthenticated} />}

        {hasData && (
          <>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.content.map((session, i) => (
                <li key={session.id}>
                  <SessionCard session={session} animationDelayMs={i * 80} />
                </li>
              ))}
            </ul>

            {!isAuthenticated && <AnonymousJoinBanner />}

            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={(p) => setFilters({ page: p === 0 ? undefined : String(p) })}
            />
          </>
        )}
      </main>
    </div>
  )
}

// ---------- helpers UI ----------

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="h-80 animate-pulse rounded-3xl border border-border bg-muted"
          aria-hidden="true"
        />
      ))}
    </ul>
  )
}

function EmptyState({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-12 text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 size-48 rotate-12 rounded-3xl bg-red opacity-[0.06]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -left-8 size-32 -rotate-12 rounded-2xl bg-yellow opacity-[0.08]"
      />

      <div className="relative mx-auto mb-5 inline-flex size-24 items-center justify-center rounded-3xl bg-yellow-soft text-yellow">
        <Dices size={56} aria-hidden="true" />
      </div>
      <h3 className="mb-2 font-display text-3xl font-bold text-foreground">
        {t('sessions.list.emptyHeading')}
      </h3>
      <p className="mb-6 text-muted-foreground">{t('sessions.list.emptyBody')}</p>
      <Link
        to={isAuthenticated ? '/sessions/new' : '/register'}
        className="inline-flex items-center gap-2 rounded-full bg-red px-6 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(200,54,44,0.25)] transition hover:scale-105"
      >
        <Plus size={16} aria-hidden="true" />
        {isAuthenticated ? t('sessions.list.emptyCta') : t('sessions.list.anonCtaPrimary')}
      </Link>
    </div>
  )
}

function AnonymousJoinBanner() {
  const { t } = useTranslation()
  return (
    <div className="relative my-12 overflow-hidden rounded-3xl border border-border bg-muted/40 p-8 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -right-12 size-40 rotate-12 rounded-3xl bg-red opacity-[0.07]"
      />
      <h3 className="relative font-display text-2xl font-bold text-foreground">
        {t('sessions.list.anonCtaTitle')}
      </h3>
      <p className="relative mx-auto mt-2 max-w-xl text-muted-foreground">
        {t('sessions.list.anonCtaSubtitle')}
      </p>
      <div className="relative mt-4 flex flex-wrap justify-center gap-3">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-full bg-red px-6 py-3 text-sm font-bold text-white transition hover:scale-105"
        >
          {t('sessions.list.anonCtaPrimary')}
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          {t('sessions.list.anonCtaSecondary')}
        </Link>
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      className="rounded-3xl border border-red bg-red-soft p-6 text-center text-foreground"
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

function parseIntSafe(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}
