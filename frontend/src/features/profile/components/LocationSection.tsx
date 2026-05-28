import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAreasQuery, useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'

import { useUpdateProfileMutation } from '../hooks/useProfile'

interface Props {
  initialProvinceCode: string | null
  initialCityCode: string | null
  initialAreaCode: string | null
}

/**
 * Sección "Ubicación" del perfil — 3 selects en cascada (provincia → ciudad →
 * zona) que reusan los hooks geo existentes. La selección de un nivel superior
 * resetea los descendientes. Botón explícito "Guardar ubicación" envía los 3
 * codes al PATCH /me/profile; feedback inline tras éxito.
 */
export function LocationSection({ initialProvinceCode, initialCityCode, initialAreaCode }: Props) {
  const { t } = useTranslation()
  const update = useUpdateProfileMutation()

  const [provinceCode, setProvinceCode] = useState<string>(initialProvinceCode ?? '')
  const [cityCode, setCityCode] = useState<string>(initialCityCode ?? '')
  const [areaCode, setAreaCode] = useState<string>(initialAreaCode ?? '')
  const [feedback, setFeedback] = useState<'saved' | null>(null)

  const { data: provinces = [] } = useProvincesQuery()
  const { data: cities = [] } = useCitiesQuery(provinceCode || undefined)
  const { data: areas = [] } = useAreasQuery(cityCode || undefined)

  function handleProvinceChange(v: string) {
    setProvinceCode(v)
    setCityCode('')
    setAreaCode('')
  }
  function handleCityChange(v: string) {
    setCityCode(v)
    setAreaCode('')
  }

  function handleSubmit() {
    update.mutate(
      {
        provinceCode: provinceCode || '',
        cityCode: cityCode || '',
        areaCode: areaCode || '',
      },
      {
        onSuccess: () => {
          setFeedback('saved')
          setTimeout(() => setFeedback(null), 2000)
        },
      },
    )
  }

  const dirty =
    provinceCode !== (initialProvinceCode ?? '') ||
    cityCode !== (initialCityCode ?? '') ||
    areaCode !== (initialAreaCode ?? '')
  const complete = Boolean(provinceCode && cityCode && areaCode)

  return (
    <div>
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B7355]">
        {t('profile.headingLocation')}
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          value={provinceCode}
          onChange={(e) => handleProvinceChange(e.target.value)}
          aria-label={t('sessions.filters.province')}
          className="rounded-md border border-muted bg-card px-3 py-2 text-sm"
        >
          <option value="">{t('sessions.filters.province')}</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={cityCode}
          onChange={(e) => handleCityChange(e.target.value)}
          disabled={!provinceCode}
          aria-label={t('sessions.filters.city')}
          className="rounded-md border border-muted bg-card px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">{t('sessions.filters.city')}</option>
          {cities.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value)}
          disabled={!cityCode}
          aria-label={t('sessions.filters.area')}
          className="rounded-md border border-muted bg-card px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">{t('sessions.filters.area')}</option>
          {areas.map((a) => (
            <option key={a.code} value={a.code}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!dirty || !complete || update.isPending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
        >
          {t('profile.locationSaveButton')}
        </button>
        {feedback === 'saved' && (
          <span className="text-xs text-green" role="status">
            {t('profile.locationSavedToast')}
          </span>
        )}
      </div>
    </div>
  )
}
