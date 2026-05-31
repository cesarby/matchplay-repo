import { Search, X } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

import { useGamesSearchQuery } from '../hooks/useGames'
import type { GameSearchResult } from '../types/game.types'

interface BrutalGameTypeaheadProps {
  /** Label accesible — siempre se renderiza, oculto visualmente con sr-only. */
  label: string
  /** Juego seleccionado (controlled). null = sin selección. */
  value: GameSearchResult | null
  /** Llamado tanto al seleccionar (game) como al limpiar (null). */
  onChange: (game: GameSearchResult | null) => void
  /** Placeholder del input. */
  placeholder?: string
  /** htmlFor del label. Si no se pasa, se autogenera con useId. */
  id?: string
}

/**
 * Typeahead de juegos de BoardGameGeek con estética brutalista.
 *
 * Pareja conceptual del `GameTypeahead` "café" (que sigue usándose en el form
 * de crear sesión, etc.). Este variante:
 *  - Usa primitivas brutal: `brutal-inner`, `bg-white`, `font-bold`.
 *  - Dropdown vía `createPortal(document.body)` para evitar clipping por
 *    `overflow-hidden` en cualquier sección ancestral (Hero, CommunityCarousel).
 *  - Recalcula posición del dropdown al scroll y resize.
 *
 * Comportamiento idéntico al `GameTypeahead` original: debounced 300ms,
 * mínimo 2 caracteres antes de buscar, lista con thumbnail + name + año +
 * rango de jugadores.
 *
 * Reusable: cualquier form brutal puede usar este componente para escoger
 * un juego del catálogo BGG.
 */
export function BrutalGameTypeahead({
  label,
  value,
  onChange,
  placeholder,
  id: idProp,
}: BrutalGameTypeaheadProps) {
  const { t } = useTranslation()
  const generatedId = useId()
  const inputId = idProp ?? generatedId

  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const debounced = useDebouncedValue(query, 300)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })

  const { data, isFetching } = useGamesSearchQuery({ q: debounced, type: 'BASE', size: 8 })
  const results = data?.content ?? []
  const showDropdown = open && debounced.trim().length >= 2

  // Sincronizar input si el padre cambia la selección (bggId distinto).
  useEffect(() => {
    setQuery(value?.name ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.bggId])

  // Cerrar al hacer click fuera (input + dropdown).
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (inputRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Calcular posición del dropdown (portal) — recalcular en scroll/resize.
  useLayoutEffect(() => {
    if (!showDropdown) return
    function reposition() {
      const r = inputRef.current?.getBoundingClientRect()
      if (!r) return
      setDropdownRect({
        top: r.bottom + window.scrollY + 6, // 6px de gap bajo el input
        left: r.left + window.scrollX,
        width: r.width,
      })
    }
    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [showDropdown])

  function handleSelect(game: GameSearchResult) {
    onChange(game)
    setQuery(game.name)
    setOpen(false)
  }

  function handleClear() {
    onChange(null)
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>

      {/* Icono lupa — siempre visible a la izquierda del input. */}
      <Search
        size={16}
        aria-hidden="true"
        strokeWidth={2.5}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />

      <input
        ref={inputRef}
        id={inputId}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={`${inputId}-listbox`}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          // Si edita tras seleccionar, deshacemos la selección.
          if (value && e.target.value !== value.name) onChange(null)
        }}
        onFocus={() => setOpen(true)}
        className="brutal-inner w-full rounded-lg bg-white px-9 py-2.5 text-sm font-bold text-foreground placeholder:font-medium placeholder:text-muted-foreground focus:outline-none md:py-3"
      />

      {/* Botón limpiar — visible si hay valor o si hay query escrita. */}
      {(value || query) && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={t('common.close')}
          className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={14} aria-hidden="true" strokeWidth={2.5} />
        </button>
      )}

      {/* Dropdown via portal — evita clipping por `overflow-hidden` en padres. */}
      {showDropdown &&
        createPortal(
          <div
            ref={dropdownRef}
            id={`${inputId}-listbox`}
            role="listbox"
            style={{
              position: 'absolute',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
            className="brutal z-50 max-h-72 overflow-auto rounded-xl bg-background"
          >
            {isFetching && (
              <p className="px-3 py-2.5 font-brutal text-[11px] uppercase tracking-widest text-muted-foreground">
                {t('common.loading')}
              </p>
            )}
            {!isFetching && results.length === 0 && (
              <p className="px-3 py-2.5 font-brutal text-[11px] uppercase tracking-widest text-muted-foreground">
                {t('landing.quickSearch.empty')}
              </p>
            )}
            {!isFetching && results.length > 0 && (
              <ul className="py-1">
                {results.map((g) => {
                  const selected = value?.bggId === g.bggId
                  return (
                    <li key={g.bggId} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        onClick={() => handleSelect(g)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                          selected ? 'bg-yellow/40' : 'hover:bg-yellow/30'
                        }`}
                      >
                        {g.thumbnailUrl ? (
                          <img
                            src={g.thumbnailUrl}
                            alt=""
                            className="brutal-sm size-9 shrink-0 rounded-md bg-white object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="brutal-sm flex size-9 shrink-0 items-center justify-center rounded-md bg-muted font-display text-lg font-black text-muted-foreground"
                          >
                            ?
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display font-bold leading-tight">
                            {g.name}
                          </span>
                          <span className="font-brutal text-[10px] uppercase tracking-widest text-muted-foreground">
                            {g.year ? `${g.year}` : '—'}
                            {g.minPlayers != null && g.maxPlayers != null && (
                              <>
                                {' '}
                                · {g.minPlayers}–{g.maxPlayers}j
                              </>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
