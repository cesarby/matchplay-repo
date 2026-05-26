import { Check, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/lib/cn'

import { useGamesSearchQuery } from '../hooks/useGames'
import type { GameSearchResult } from '../types/game.types'

import { GameTypeahead } from './GameTypeahead'

interface GameWithExpansionsPickerProps {
  /** Juego base seleccionado (controlled). */
  baseGame: GameSearchResult | null
  onBaseGameChange: (game: GameSearchResult | null) => void
  /** Expansiones añadidas (controlled). */
  expansions: GameSearchResult[]
  onExpansionsChange: (expansions: GameSearchResult[]) => void

  /** Labels (i18n se resuelve en el consumidor). */
  baseLabel: string
  expansionsLabel: string

  basePlaceholder?: string
  expansionPlaceholder?: string

  baseError?: string
  expansionsError?: string
}

/**
 * Combo reutilizable "1 juego base + N expansiones".
 *
 * Composición:
 * - Sin base seleccionado → {@link GameTypeahead} para el base.
 * - Con base → card con thumbnail + nombre + ✕; el input desaparece.
 *   Si {@code baseGame.hasExpansions === true} aparece debajo un buscador
 *   multi-select de expansiones del mismo base. Chips bajo el input con ✕
 *   por chip. Las ya añadidas aparecen con check en el dropdown.
 *
 * Reglas:
 * - Cambiar/quitar base limpia silenciosamente las expansiones.
 * - Dedupe automático: click sobre una ya añadida es no-op.
 */
export function GameWithExpansionsPicker({
  baseGame,
  onBaseGameChange,
  expansions,
  onExpansionsChange,
  baseLabel,
  expansionsLabel,
  basePlaceholder,
  expansionPlaceholder,
  baseError,
  expansionsError,
}: GameWithExpansionsPickerProps) {
  function handleBaseChange(next: GameSearchResult | null) {
    // Si cambia (o se quita) el base, las expansiones existentes ya no
    // pertenecen a él → se limpian sin aviso.
    if (next?.bggId !== baseGame?.bggId && expansions.length > 0) {
      onExpansionsChange([])
    }
    onBaseGameChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      {baseGame ? (
        <BaseGameCard
          label={baseLabel}
          game={baseGame}
          error={baseError}
          onRemove={() => handleBaseChange(null)}
        />
      ) : (
        <GameTypeahead
          label={baseLabel}
          value={null}
          onChange={handleBaseChange}
          error={baseError}
          placeholder={basePlaceholder}
        />
      )}

      {baseGame && baseGame.hasExpansions && (
        <ExpansionMultiPicker
          label={expansionsLabel}
          baseGame={baseGame}
          value={expansions}
          onChange={onExpansionsChange}
          placeholder={expansionPlaceholder}
          error={expansionsError}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BaseGameCard — card que muestra el juego base seleccionado
// ---------------------------------------------------------------------------

interface BaseGameCardProps {
  label: string
  game: GameSearchResult
  error?: string
  onRemove: () => void
}

function BaseGameCard({ label, game, error, onRemove }: BaseGameCardProps) {
  const errorId = useId()
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <div
        className={cn(
          'flex items-center gap-3 rounded-sm border bg-card p-3',
          error ? 'border-red' : 'border-border',
        )}
        aria-describedby={error ? errorId : undefined}
      >
        {game.thumbnailUrl ? (
          <img src={game.thumbnailUrl} alt="" className="size-12 shrink-0 rounded object-cover" />
        ) : (
          <div aria-hidden="true" className="size-12 shrink-0 rounded bg-muted" />
        )}
        <div className="flex flex-1 flex-col">
          <span className="font-medium">{game.name}</span>
          <span className="text-xs text-muted-foreground">
            {game.year != null && <>{game.year}</>}
            {game.year != null && game.minPlayers != null && game.maxPlayers != null && ' · '}
            {game.minPlayers != null && game.maxPlayers != null && (
              <>
                {game.minPlayers}–{game.maxPlayers} jugadores
              </>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar juego seleccionado"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {error && (
        <span id={errorId} role="alert" className="text-sm text-red">
          {error}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ExpansionMultiPicker — input + dropdown + chips
// ---------------------------------------------------------------------------

interface ExpansionMultiPickerProps {
  label: string
  baseGame: GameSearchResult
  value: GameSearchResult[]
  onChange: (next: GameSearchResult[]) => void
  placeholder?: string
  error?: string
}

function ExpansionMultiPicker({
  label,
  baseGame,
  value,
  onChange,
  placeholder,
  error,
}: ExpansionMultiPickerProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const errorId = `${inputId}-error`

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebouncedValue(query, 300)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // type=EXPANSION + baseGameId: el backend ignora `q`. La hook habilita la
  // query con solo el baseGameId. Filtrado por texto se hace en cliente.
  const { data, isFetching } = useGamesSearchQuery({
    type: 'EXPANSION',
    baseGameId: baseGame.bggId,
    size: 50,
  })

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const all = data?.content ?? []
  const filtered =
    debounced.trim().length === 0
      ? all
      : all.filter((g) => g.name.toLowerCase().includes(debounced.trim().toLowerCase()))

  function isAlreadyAdded(g: GameSearchResult) {
    return value.some((v) => v.bggId === g.bggId)
  }

  function handleAdd(g: GameSearchResult) {
    if (isAlreadyAdded(g)) return // no-op si ya está
    onChange([...value, g])
    // Mantenemos el input abierto y la query como está para que el usuario
    // pueda añadir varias seguidas. Solo limpiamos el texto.
    setQuery('')
  }

  function handleRemove(bggId: number) {
    onChange(value.filter((v) => v.bggId !== bggId))
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
          }}
          onFocus={() => setOpen(true)}
          className={cn(
            'w-full rounded-sm border bg-card py-2 pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-blue',
            error && 'border-red',
            !error && 'border-border',
          )}
        />

        {open && (
          <ul
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded border border-border bg-card shadow-lg"
          >
            {isFetching && (
              <li className="px-3 py-2 text-sm text-muted-foreground">{t('common.loading')}</li>
            )}
            {!isFetching && filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {t('sessions.list.empty')}
              </li>
            )}
            {!isFetching &&
              filtered.map((g) => {
                const added = isAlreadyAdded(g)
                return (
                  <li key={g.bggId} role="option" aria-selected={added}>
                    <button
                      type="button"
                      onClick={() => handleAdd(g)}
                      disabled={added}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm',
                        added ? 'cursor-default opacity-70' : 'hover:bg-muted',
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
                      <span className="flex-1">
                        <span className="font-medium">{g.name}</span>
                        {g.year && (
                          <span className="ml-1 text-xs text-muted-foreground">({g.year})</span>
                        )}
                      </span>
                      {added && <Check size={16} aria-hidden="true" className="text-green" />}
                    </button>
                  </li>
                )
              })}
          </ul>
        )}
      </div>

      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label={label}>
          {value.map((g) => (
            <li key={g.bggId}>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-sm">
                <span>{g.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(g.bggId)}
                  aria-label={`Quitar ${g.name}`}
                  className="ml-1 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <span id={errorId} role="alert" className="text-sm text-red">
          {error}
        </span>
      )}
    </div>
  )
}
