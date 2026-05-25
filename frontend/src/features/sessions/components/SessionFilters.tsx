import { Building2, Calendar, ChevronDown, Compass, Dices, MapPin, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGamesSearchQuery } from '@/features/games/hooks/useGames'
import type { GameSearchResult } from '@/features/games/types/game.types'
import { useAreasQuery, useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/lib/cn'

export interface SessionFiltersValue {
  provinceCode?: string
  cityCode?: string
  areaCode?: string
  /** Día concreto YYYY-MM-DD. Se traduce a rango from/to en SessionsListPage. */
  date?: string
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
 * Filtros del listado de partidas, presentados como "cards interactivas" con
 * icono coloreado en pill, label de campo y valor seleccionado.
 *
 * Filtros disponibles:
 *  - provincia → ciudad → zona (cascada, mismo origen geo del usuario)
 *  - fecha (un día concreto)
 *  - juego (typeahead BGG, solo bases — nunca expansiones)
 */
export function SessionFilters({ value, onChange, onClear }: SessionFiltersProps) {
  const { t } = useTranslation()

  const { data: provinces = [] } = useProvincesQuery()
  const { data: cities = [] } = useCitiesQuery(value.provinceCode)
  const { data: areas = [] } = useAreasQuery(value.cityCode)

  const hasAnyFilter = Boolean(
    value.provinceCode || value.cityCode || value.areaCode || value.date || value.gameId,
  )

  const provinceName = provinces.find((p) => p.code === value.provinceCode)?.name
  const cityName = cities.find((c) => c.code === value.cityCode)?.name
  const areaName = areas.find((a) => a.code === value.areaCode)?.name
  const dateLabel = value.date ? formatDateDDMMYYYY(value.date) : undefined

  return (
    <section
      aria-label={t('sessions.list.title')}
      className="rounded-2xl border border-border bg-card p-4 shadow-warm"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:items-stretch">
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

        {/* Fecha (un día) */}
        <FilterPill
          label={t('sessions.filters.date')}
          value={dateLabel}
          icon={<Calendar size={18} aria-hidden="true" />}
          iconBg="bg-red-soft"
          iconColor="text-red"
        >
          <input
            type="date"
            value={value.date ?? ''}
            onChange={(e) => onChange({ date: e.target.value || undefined })}
            aria-label={t('sessions.filters.date')}
            className="absolute inset-0 cursor-pointer appearance-none bg-transparent opacity-0"
          />
        </FilterPill>

        {/* Juego (typeahead BGG, solo base) */}
        <GameFilterPill
          label={t('sessions.filters.game')}
          placeholder={t('sessions.filters.gamePlaceholder')}
          value={
            value.gameId && value.gameName ? { bggId: value.gameId, name: value.gameName } : null
          }
          onSelect={(game) =>
            onChange({
              gameId: game?.bggId,
              gameName: game?.name,
            })
          }
        />
      </div>

      {hasAnyFilter && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <X size={12} aria-hidden="true" />
            {t('sessions.filters.clear')}
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

interface GameFilterPillProps {
  label: string
  placeholder: string
  value: { bggId: number; name: string } | null
  onSelect: (game: GameSearchResult | null) => void
}

/**
 * Pill especial para el filtro de juego. No puede ser un select nativo
 * porque el origen es BGG vía API; usa un popover con typeahead debounced.
 * El control respeta la altura/look del resto de pills.
 */
function GameFilterPill({ label, placeholder, value, onSelect }: GameFilterPillProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 300)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useGamesSearchQuery({ q: debounced, type: 'BASE', size: 10 })
  const results = data?.content ?? []

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition hover:bg-muted"
      >
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-blue"
        >
          <Dices size={18} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              'truncate text-sm font-semibold',
              value ? 'text-foreground' : 'italic text-muted-foreground',
            )}
          >
            {value?.name ?? '—'}
          </p>
        </div>
        {value ? (
          <button
            type="button"
            aria-label="Quitar filtro de juego"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(null)
              setOpen(false)
            }}
            className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : (
          <ChevronDown size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="relative border-b border-border">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              // Focus inicial intencional: el usuario acaba de abrir el popover
              // expresamente para buscar, debe teclear sin un clic extra.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-auto">
            {debounced.trim().length < 2 && (
              <li className="px-3 py-2 text-sm italic text-muted-foreground">{placeholder}</li>
            )}
            {debounced.trim().length >= 2 && isFetching && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>
            )}
            {debounced.trim().length >= 2 && !isFetching && results.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
            )}
            {!isFetching &&
              results.map((g) => {
                const selected = value?.bggId === g.bggId
                return (
                  <li key={g.bggId} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(g)
                        setOpen(false)
                        setQuery('')
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-muted',
                        selected && 'bg-muted',
                      )}
                    >
                      {g.thumbnailUrl ? (
                        <img
                          src={g.thumbnailUrl}
                          alt=""
                          className="size-8 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div aria-hidden="true" className="size-8 shrink-0 rounded bg-muted" />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium text-foreground">{g.name}</span>
                        {g.year && (
                          <span className="ml-1 text-xs text-muted-foreground">({g.year})</span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
          </ul>
        </div>
      )}
    </div>
  )
}

/** YYYY-MM-DD → "DD/MM/YYYY" para mostrar dentro del pill. */
function formatDateDDMMYYYY(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}
