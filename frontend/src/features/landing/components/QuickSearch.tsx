import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { BrutalGameTypeahead } from '@/features/games/components/BrutalGameTypeahead'
import type { GameSearchResult } from '@/features/games/types/game.types'
import { useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'

interface QuickSearchState {
  provinceCode: string
  cityCode: string
  /** Juego seleccionado del typeahead BGG (null si no hay selección). */
  game: GameSearchResult | null
}

/**
 * Formulario de búsqueda rápida brutal.
 *
 * Layout:
 * - Desktop (md+): grid 1fr 1fr 1.3fr auto (provincia, ciudad, juego, botón).
 * - Mobile (<md): stack — provincia + ciudad en fila, juego full-width abajo,
 *   botón full-width.
 *
 * Comportamiento del campo "Juego": typeahead con búsqueda debounced contra
 * BGG (`BrutalGameTypeahead` → `useGamesSearchQuery`). Al seleccionar un
 * resultado, su `bggId` se mete en la URL como `?gameId={bggId}` para que
 * `SessionsListPage` pueda filtrar. Texto libre sin selección NO va a la URL
 * (no aporta — el listado no soporta búsqueda full-text).
 */
export function QuickSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [state, setState] = useState<QuickSearchState>({
    provinceCode: '',
    cityCode: '',
    game: null,
  })

  const { data: provinces = [] } = useProvincesQuery()
  const { data: cities = [] } = useCitiesQuery(state.provinceCode || undefined)

  function handleProvinceChange(provinceCode: string) {
    setState((s) => ({ ...s, provinceCode, cityCode: '' }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (state.provinceCode) params.set('provinceCode', state.provinceCode)
    if (state.cityCode) params.set('cityCode', state.cityCode)
    if (state.game) params.set('gameId', String(state.game.bggId))
    navigate(`/sessions?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={t('landing.quickSearch.label')}
      className="brutal-lg rounded-2xl bg-background p-3 md:p-4"
    >
      {/* Desktop: grid 4 cols. Mobile: stack. */}
      <div className="flex flex-col gap-2 md:grid md:grid-cols-[1fr_1fr_1.3fr_auto] md:gap-3">
        {/* Provincia + Ciudad en fila compartida en mobile, columnas separadas en desktop */}
        <div className="flex gap-2 md:contents">
          <div className="flex-1">
            <label htmlFor="qs-province" className="sr-only">
              {t('landing.quickSearch.province')}
            </label>
            <select
              id="qs-province"
              value={state.provinceCode}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="brutal-inner w-full rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-foreground focus:outline-none md:px-4 md:py-3"
            >
              <option value="">{t('landing.quickSearch.province')}</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="qs-city" className="sr-only">
              {t('landing.quickSearch.city')}
            </label>
            <select
              id="qs-city"
              value={state.cityCode}
              onChange={(e) => setState((s) => ({ ...s, cityCode: e.target.value }))}
              disabled={!state.provinceCode}
              className="brutal-inner w-full rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:px-4 md:py-3"
            >
              <option value="">{t('landing.quickSearch.city')}</option>
              {cities.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Juego — typeahead BGG con dropdown brutal */}
        <BrutalGameTypeahead
          id="qs-game"
          label={t('landing.quickSearch.game')}
          value={state.game}
          onChange={(game) => setState((s) => ({ ...s, game }))}
          placeholder={t('landing.quickSearch.gamePlaceholder')}
        />

        {/* Submit */}
        <button
          type="submit"
          className="brutal-sm brutal-press md:brutal-hover flex items-center justify-center gap-2 rounded-lg bg-foreground py-3 font-display text-sm font-bold text-background md:px-6 md:py-3"
        >
          <Search size={16} strokeWidth={2.5} aria-hidden="true" />
          {t('landing.quickSearch.submit')}
        </button>
      </div>
    </form>
  )
}
