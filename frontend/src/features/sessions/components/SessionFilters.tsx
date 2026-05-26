import { Building2, ChevronDown, Compass, MapPin, X } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { GameTypeahead } from '@/features/games/components/GameTypeahead'
import type { GameSearchResult } from '@/features/games/types/game.types'
import { useAreasQuery, useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'
import { cn } from '@/shared/lib/cn'

export interface SessionFiltersValue {
  provinceCode?: string
  cityCode?: string
  areaCode?: string
  /** bggId del juego seleccionado (filtra type=BASE en backend). */
  gameId?: number
  /** Nombre visible del juego — viene del URL para evitar re-fetch del detalle. */
  gameName?: string
}

interface SessionFiltersProps {
  value: SessionFiltersValue
  onChange: (patch: Partial<SessionFiltersValue>) => void
  onClear: () => void
}

/**
 * Filtros del listado de partidas:
 *  - provincia → ciudad → zona (cascada, mismo origen geo del usuario)
 *  - juego (typeahead BGG, solo bases — mismo componente que el form de crear partida)
 *
 * Los tres filtros geo se renderizan como "pills interactivas" con icono coloreado;
 * el de juego usa el {@link GameTypeahead} para reutilizar la UX del form de crear,
 * y abarca 2 columnas en desktop para acomodar nombres largos.
 */
export function SessionFilters({ value, onChange, onClear }: SessionFiltersProps) {
  const { t } = useTranslation()

  const { data: provinces = [] } = useProvincesQuery()
  const { data: cities = [] } = useCitiesQuery(value.provinceCode)
  const { data: areas = [] } = useAreasQuery(value.cityCode)

  const activeCount = [value.provinceCode, value.cityCode, value.areaCode, value.gameId].filter(
    Boolean,
  ).length
  const hasAnyFilter = activeCount > 0

  const provinceName = provinces.find((p) => p.code === value.provinceCode)?.name
  const cityName = cities.find((c) => c.code === value.cityCode)?.name
  const areaName = areas.find((a) => a.code === value.areaCode)?.name

  // El typeahead pide un GameSearchResult completo. En la URL sólo guardamos
  // bggId + name, así que reconstruimos un objeto parcial — el componente
  // sólo usa `name` para inicializar el input y `bggId` para la comparación.
  const gameValue: GameSearchResult | null =
    value.gameId && value.gameName
      ? ({
          bggId: value.gameId,
          name: value.gameName,
          year: null,
          minPlayers: null,
          maxPlayers: null,
          minPlayTimeMinutes: null,
          maxPlayTimeMinutes: null,
          thumbnailUrl: null,
          imageUrl: null,
          isExpansion: false,
          hasExpansions: false,
          baseGameBggId: null,
        } satisfies GameSearchResult)
      : null

  return (
    <section
      aria-label={t('sessions.list.title')}
      className="rounded-2xl border border-border bg-card p-4 shadow-warm"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4 lg:items-center">
        {/* Provincia */}
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

        {/* Ciudad */}
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

        {/* Zona */}
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

        {/* Juego — typeahead BGG, mismo componente que crear partida (sin expansiones).
            Label oculto visualmente (solo para a11y): el placeholder ya orienta. */}
        <GameTypeahead
          label={t('sessions.filters.game')}
          labelSrOnly
          value={gameValue}
          onChange={(g) =>
            onChange({
              gameId: g?.bggId,
              gameName: g?.name,
            })
          }
          placeholder={t('sessions.filters.gamePlaceholder')}
        />
      </div>

      {hasAnyFilter && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            aria-label={t('sessions.filters.clear')}
            className="group inline-flex items-center gap-1.5 rounded-full bg-red-soft px-4 py-1.5 text-xs font-semibold text-red transition hover:scale-105 hover:bg-red hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <X
              size={14}
              aria-hidden="true"
              className="transition-transform group-hover:rotate-90"
            />
            {t('sessions.filters.clearWithCount', { count: activeCount })}
          </button>
        </div>
      )}
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
