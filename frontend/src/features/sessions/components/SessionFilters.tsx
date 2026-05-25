import { useTranslation } from 'react-i18next'

import { useAreasQuery, useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'

export interface SessionFiltersValue {
  provinceCode?: string
  cityCode?: string
  areaCode?: string
}

interface SessionFiltersProps {
  value: SessionFiltersValue
  onChange: (patch: Partial<SessionFiltersValue>) => void
  onClear: () => void
}

/**
 * Barra de filtros del listado de partidas.
 *
 * - 100% ubicación: provincia → ciudad → zona, en cascada.
 * - Cambiar provincia limpia ciudad y zona; cambiar ciudad limpia zona.
 * - El filtro por status (OPEN/FULL/...) NO se expone al usuario en v1;
 *   el backend lo soporta pero no es útil aún para el usuario final.
 */
export function SessionFilters({ value, onChange, onClear }: SessionFiltersProps) {
  const { t } = useTranslation()

  const { data: provinces = [] } = useProvincesQuery()
  const { data: cities = [] } = useCitiesQuery(value.provinceCode)
  const { data: areas = [] } = useAreasQuery(value.cityCode)

  const hasAnyFilter = Boolean(value.provinceCode || value.cityCode || value.areaCode)

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
              onChange({
                provinceCode: e.target.value || undefined,
                cityCode: undefined,
                areaCode: undefined,
              })
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
            onChange={(e) =>
              onChange({ cityCode: e.target.value || undefined, areaCode: undefined })
            }
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

        {/* Zona */}
        <div>
          <label htmlFor="filter-area" className="mb-1 block text-sm font-medium">
            {t('sessions.filters.area')}
          </label>
          <select
            id="filter-area"
            value={value.areaCode ?? ''}
            onChange={(e) => onChange({ areaCode: e.target.value || undefined })}
            disabled={!value.cityCode}
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t('sessions.filters.area')}</option>
            {areas.map((a) => (
              <option key={a.code} value={a.code}>
                {a.name}
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
