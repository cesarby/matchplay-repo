import { Check, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/lib/cn'

import { useGamesSearchQuery } from '../hooks/useGames'
import type { GameSearchResult } from '../types/game.types'

interface GameTypeaheadProps {
  label: string
  /** Juego seleccionado (controlled). */
  value: GameSearchResult | null
  onChange: (game: GameSearchResult | null) => void
  /** Mensaje de error para mostrar bajo el input. */
  error?: string
  placeholder?: string
  /** Texto cuando no hay resultados (cuando ya se hizo búsqueda). */
  emptyText?: string
}

/**
 * Combobox para buscar un juego de BoardGameGeek.
 *
 * - Escribe (≥2 chars) → llama a {@code /api/v1/games} debounced 300ms
 * - Resultados en dropdown bajo el input
 * - Click en uno → se vuelve "seleccionado", el input muestra su nombre
 * - Botón ✕ → limpia selección
 *
 * NOTA a11y: hemos optado por un patrón simple (input + lista). Para una
 * implementación combobox ARIA completa convendría una librería (downshift,
 * react-aria) — fuera de scope v1.
 */
export function GameTypeahead({
  label,
  value,
  onChange,
  error,
  placeholder,
  emptyText,
}: GameTypeaheadProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const errorId = `${inputId}-error`

  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const debounced = useDebouncedValue(query, 300)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useGamesSearchQuery({ q: debounced, type: 'BASE', size: 10 })

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Si cambian externamente el valor, sincronizamos el input
  useEffect(() => {
    if (value) setQuery(value.name)
  }, [value])

  const results = data?.content ?? []
  const showDropdown = open && debounced.trim().length >= 2

  function handleSelect(game: GameSearchResult) {
    onChange(game)
    setQuery(game.name)
    setOpen(false)
  }

  function handleClear() {
    onChange(null)
    setQuery('')
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-1" ref={wrapperRef}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>

      <div className="relative">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            // Si el usuario edita tras seleccionar, deshacemos selección
            if (value && e.target.value !== value.name) onChange(null)
          }}
          onFocus={() => setOpen(true)}
          className={cn(
            'w-full rounded-sm border bg-card py-2 pl-9 pr-10 text-base outline-none focus:ring-2 focus:ring-blue',
            error && 'border-red',
            !error && 'border-border',
          )}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpiar selección"
            className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <ul
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded border border-border bg-card shadow-lg"
          >
            {isFetching && (
              <li className="px-3 py-2 text-sm text-muted-foreground">{t('common.loading')}</li>
            )}
            {!isFetching && results.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {emptyText ?? t('sessions.list.empty')}
              </li>
            )}
            {!isFetching &&
              results.map((g) => {
                const selected = value?.bggId === g.bggId
                return (
                  <li key={g.bggId} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => handleSelect(g)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
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
                      <span className="flex-1">
                        <span className="font-medium">{g.name}</span>
                        {g.year && (
                          <span className="ml-1 text-xs text-muted-foreground">({g.year})</span>
                        )}
                        {g.minPlayers != null && g.maxPlayers != null && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {g.minPlayers}–{g.maxPlayers} jugadores
                          </span>
                        )}
                      </span>
                      {selected && <Check size={16} aria-hidden="true" className="text-green" />}
                    </button>
                  </li>
                )
              })}
          </ul>
        )}
      </div>

      {error && (
        <span id={errorId} role="alert" className="text-sm text-red">
          {error}
        </span>
      )}
    </div>
  )
}
