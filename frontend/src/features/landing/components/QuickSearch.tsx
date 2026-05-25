import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'

interface QuickSearchState {
  provinceCode: string
  cityCode: string
  game: string
}

/**
 * Formulario de búsqueda rápida del hero.
 * Estado local, navegación a /sessions con query string.
 */
export function QuickSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [state, setState] = useState<QuickSearchState>({
    provinceCode: '',
    cityCode: '',
    game: '',
  })

  const { data: provinces = [] } = useProvincesQuery()
  const { data: cities = [] } = useCitiesQuery(state.provinceCode || undefined)

  function handleProvinceChange(provinceCode: string) {
    setState({ provinceCode, cityCode: '', game: state.game })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (state.provinceCode) params.set('province', state.provinceCode)
    if (state.cityCode) params.set('city', state.cityCode)
    if (state.game.trim()) params.set('q', state.game.trim())
    navigate(`/sessions?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={t('landing.quickSearch.label')}
      className="rounded border border-border bg-card p-4 shadow-[var(--shadow-warm)]"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Provincia */}
        <div>
          <label htmlFor="qs-province" className="sr-only">
            {t('landing.quickSearch.province')}
          </label>
          <select
            id="qs-province"
            value={state.provinceCode}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue"
          >
            <option value="">{t('landing.quickSearch.province')}</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ciudad */}
        <div>
          <label htmlFor="qs-city" className="sr-only">
            {t('landing.quickSearch.city')}
          </label>
          <select
            id="qs-city"
            value={state.cityCode}
            onChange={(e) => setState((s) => ({ ...s, cityCode: e.target.value }))}
            disabled={!state.provinceCode}
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t('landing.quickSearch.city')}</option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Juego */}
        <div>
          <label htmlFor="qs-game" className="sr-only">
            {t('landing.quickSearch.game')}
          </label>
          <input
            id="qs-game"
            type="text"
            value={state.game}
            onChange={(e) => setState((s) => ({ ...s, game: e.target.value }))}
            placeholder={t('landing.quickSearch.game')}
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-red px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 sm:mt-3"
      >
        <Search size={16} aria-hidden="true" />
        {t('landing.quickSearch.submit')}
      </button>
    </form>
  )
}
