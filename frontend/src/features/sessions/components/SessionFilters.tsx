import { useTranslation } from 'react-i18next'

import { useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'
import type { SessionStatus } from '@/features/sessions/types/session.types'

const STATUS_OPTIONS: SessionStatus[] = ['OPEN', 'FULL', 'IN_PROGRESS']

export interface SessionFiltersValue {
  provinceCode?: string
  cityCode?: string
  status?: SessionStatus
}

interface SessionFiltersProps {
  value: SessionFiltersValue
  onChange: (patch: Partial<SessionFiltersValue>) => void
  onClear: () => void
}

/**
 * Barra de filtros para el listado de partidas.
 *
 * - Controlled — el padre mantiene el estado (normalmente en URL).
 * - Cambiar provincia limpia ciudad automáticamente.
 * - Mobile: grid 1 col; Desktop ≥md: grid 3 col + acciones a la derecha.
 */
export function SessionFilters({ value, onChange, onClear }: SessionFiltersProps) {
  const { t } = useTranslation()

  const { data: provinces = [] } = useProvincesQuery()
  const { data: cities = [] } = useCitiesQuery(value.provinceCode)

  const hasAnyFilter = Boolean(value.provinceCode || value.cityCode || value.status)

  return (
    <section
      aria-label={t('sessions.list.title')}
      className="rounded border border-border bg-card p-4 shadow-[var(--shadow-warm)]"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        {/* Provincia */}
        <div>
          <label htmlFor="filter-province" className="mb-1 block text-sm font-medium">
            {t('sessions.filters.province')}
          </label>
          <select
            id="filter-province"
            value={value.provinceCode ?? ''}
            onChange={(e) =>
              onChange({ provinceCode: e.target.value || undefined, cityCode: undefined })
            }
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
          >
            <option value="">{t('sessions.filters.province')}</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ciudad */}
        <div>
          <label htmlFor="filter-city" className="mb-1 block text-sm font-medium">
            {t('sessions.filters.city')}
          </label>
          <select
            id="filter-city"
            value={value.cityCode ?? ''}
            onChange={(e) => onChange({ cityCode: e.target.value || undefined })}
            disabled={!value.provinceCode}
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t('sessions.filters.city')}</option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="filter-status" className="mb-1 block text-sm font-medium">
            {t('sessions.filters.status')}
          </label>
          <select
            id="filter-status"
            value={value.status ?? ''}
            onChange={(e) => onChange({ status: (e.target.value as SessionStatus) || undefined })}
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
          >
            <option value="">{t('sessions.filters.status')}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`sessions.status.${s}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Clear */}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center rounded-sm border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            {t('sessions.filters.clear')}
          </button>
        )}
      </div>
    </section>
  )
}
