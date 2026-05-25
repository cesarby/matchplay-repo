import { Building2, ChevronDown, Compass, MapPin, X } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { useAreasQuery, useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'
import { cn } from '@/shared/lib/cn'

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
 * Filtros del listado de partidas, presentados como "cards interactivas" con
 * icono coloreado en pill, label de campo y valor seleccionado.
 *
 * El control real sigue siendo un {@code <select>} con
 * {@code appearance-none + absolute opacity-0} encima de la card. Así
 * conservamos accesibilidad (teclado, screen reader, mobile native picker)
 * sin perder el look.
 */
export function SessionFilters({ value, onChange, onClear }: SessionFiltersProps) {
  const { t } = useTranslation()

  const { data: provinces = [] } = useProvincesQuery()
  const { data: cities = [] } = useCitiesQuery(value.provinceCode)
  const { data: areas = [] } = useAreasQuery(value.cityCode)

  const hasAnyFilter = Boolean(value.provinceCode || value.cityCode || value.areaCode)

  const provinceName = provinces.find((p) => p.code === value.provinceCode)?.name
  const cityName = cities.find((c) => c.code === value.cityCode)?.name
  const areaName = areas.find((a) => a.code === value.areaCode)?.name

  return (
    <section
      aria-label={t('sessions.list.title')}
      className="rounded-2xl border border-border bg-card p-4 shadow-warm"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-stretch">
        <FilterPill
          label={t('sessions.filters.province')}
          value={provinceName}
          icon={<MapPin size={18} aria-hidden="true" />}
          iconBg="bg-blue-soft"
          iconColor="text-blue"
        >
          <select
            value={value.provinceCode ?? ''}
            onChange={(e) =>
              onChange({
                provinceCode: e.target.value || undefined,
                cityCode: undefined,
                areaCode: undefined,
              })
            }
            aria-label={t('sessions.filters.province')}
            className="absolute inset-0 cursor-pointer appearance-none bg-transparent opacity-0"
          >
            <option value="">{t('sessions.filters.province')}</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </FilterPill>

        <FilterPill
          label={t('sessions.filters.city')}
          value={cityName}
          icon={<Building2 size={18} aria-hidden="true" />}
          iconBg="bg-green-soft"
          iconColor="text-green"
          disabled={!value.provinceCode}
        >
          <select
            value={value.cityCode ?? ''}
            onChange={(e) =>
              onChange({ cityCode: e.target.value || undefined, areaCode: undefined })
            }
            disabled={!value.provinceCode}
            aria-label={t('sessions.filters.city')}
            className="absolute inset-0 cursor-pointer appearance-none bg-transparent opacity-0 disabled:cursor-not-allowed"
          >
            <option value="">{t('sessions.filters.city')}</option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </FilterPill>

        <FilterPill
          label={t('sessions.filters.area')}
          value={areaName}
          icon={<Compass size={18} aria-hidden="true" />}
          iconBg="bg-yellow-soft"
          iconColor="text-yellow"
          disabled={!value.cityCode}
        >
          <select
            value={value.areaCode ?? ''}
            onChange={(e) => onChange({ areaCode: e.target.value || undefined })}
            disabled={!value.cityCode}
            aria-label={t('sessions.filters.area')}
            className="absolute inset-0 cursor-pointer appearance-none bg-transparent opacity-0 disabled:cursor-not-allowed"
          >
            <option value="">{t('sessions.filters.area')}</option>
            {areas.map((a) => (
              <option key={a.code} value={a.code}>
                {a.name}
              </option>
            ))}
          </select>
        </FilterPill>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <X size={14} aria-hidden="true" />
            {t('sessions.filters.clear')}
          </button>
        )}
      </div>
    </section>
  )
}

interface FilterPillProps {
  label: string
  value: string | undefined
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  disabled?: boolean
  children: React.ReactNode
}

function FilterPill({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  disabled = false,
  children,
}: FilterPillProps) {
  const id = useId()
  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 transition',
        disabled ? 'opacity-50' : 'cursor-pointer hover:bg-muted',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          iconBg,
          iconColor,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p id={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            'truncate text-sm font-semibold',
            value ? 'text-foreground' : 'italic text-muted-foreground',
          )}
        >
          {value ?? '—'}
        </p>
      </div>
      <ChevronDown size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      {children}
    </div>
  )
}
