import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { GameTypeahead } from '@/features/games/components/GameTypeahead'
import type { GameSearchResult } from '@/features/games/types/game.types'
import { useAreasQuery, useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'
import type { ApiError } from '@/shared/api/ApiError'
import { Button } from '@/shared/components/Button'
import { SelectField } from '@/shared/components/SelectField'
import { TextField } from '@/shared/components/TextField'

import { useCreateSessionMutation } from '../hooks/useSessions'
import { mapSessionError } from '../lib/errorMapping'
import type { CreateSessionRequest } from '../types/session.types'

/**
 * Schema de validación cliente para Create.
 * Las claves de error son keys i18n (se resuelven en render con t()).
 *
 * Notas:
 * - `game` es objeto seleccionado (no string). Se valida que esté presente.
 * - `scheduledAt` se almacena como string del input (datetime-local) y se valida que sea futuro.
 * - `maxPlayers` 2-20 (mismo rango que el backend). El límite del juego BGG
 *   lo refuerza el backend con 400 si se excede.
 */
const schema = z.object({
  title: z.string().min(1, 'sessions.errors.required').max(150, 'sessions.errors.tooLong'),
  description: z.string().max(5000, 'sessions.errors.tooLong').optional(),
  game: z.object({
    bggId: z.number(),
    name: z.string(),
    minPlayers: z.number().nullable(),
    maxPlayers: z.number().nullable(),
  }),
  provinceCode: z.string().min(1, 'sessions.errors.required'),
  cityCode: z.string().min(1, 'sessions.errors.required'),
  areaCode: z.string().optional(),
  scheduledAt: z
    .string()
    .min(1, 'sessions.errors.required')
    .refine(
      (v) => {
        const d = new Date(v)
        return Number.isFinite(d.getTime()) && d.getTime() > Date.now()
      },
      { message: 'sessions.errors.scheduledInPast' },
    ),
  maxPlayers: z.coerce
    .number()
    .int()
    .min(2, 'sessions.errors.maxBelowGameMin')
    .max(20, 'sessions.errors.maxAboveGame'),
})

type FormValues = z.infer<typeof schema>

const ALLOWED_FIELDS: (keyof FormValues)[] = [
  'title',
  'description',
  'provinceCode',
  'cityCode',
  'areaCode',
  'scheduledAt',
  'maxPlayers',
]

function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'code' in value && 'status' in value
}

export function CreateSessionForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mutation = useCreateSessionMutation()
  const [banner, setBanner] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      provinceCode: '',
      cityCode: '',
      areaCode: '',
      scheduledAt: '',
      maxPlayers: 4,
    },
  })

  const provinceCode = watch('provinceCode')
  const cityCode = watch('cityCode')
  const selectedGame = watch('game') as GameSearchResult | undefined

  const provincesQuery = useProvincesQuery()
  const citiesQuery = useCitiesQuery(provinceCode)
  const areasQuery = useAreasQuery(cityCode)

  const onSubmit = handleSubmit((raw) => {
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string' && (ALLOWED_FIELDS as string[]).includes(field)) {
          setError(field as keyof FormValues, { message: issue.message })
        } else if (field === 'game') {
          setBanner(t('sessions.errors.required'))
        }
      }
      return
    }
    setBanner(null)

    const body: CreateSessionRequest = {
      title: parsed.data.title,
      description: parsed.data.description?.trim() || null,
      baseGameId: parsed.data.game.bggId,
      cityCode: parsed.data.cityCode,
      areaCode: parsed.data.areaCode?.trim() || null,
      // datetime-local da "2030-01-15T20:00" — el navegador lo asume local.
      // toISOString lo lleva a Instant (UTC) que es lo que espera el backend.
      scheduledAt: new Date(parsed.data.scheduledAt).toISOString(),
      maxPlayers: parsed.data.maxPlayers,
    }

    mutation.mutate(body, {
      onSuccess: (created) => navigate(`/sessions/${created.id}`),
      onError: (err) => {
        if (!isApiError(err)) {
          setBanner(t('auth.errors.generic'))
          return
        }
        // Errores de validación por campo (Bean Validation del backend)
        if (err.fieldErrors) {
          for (const fe of err.fieldErrors) {
            if ((ALLOWED_FIELDS as string[]).includes(fe.field)) {
              setError(fe.field as keyof FormValues, { message: fe.message })
            }
          }
          return
        }
        const mapping = mapSessionError(err)
        if (mapping.channel === 'field' && (ALLOWED_FIELDS as string[]).includes(mapping.field)) {
          setError(mapping.field as keyof FormValues, { message: t(mapping.i18nKey) })
          return
        }
        setBanner(t(mapping.i18nKey))
      },
    })
  })

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {banner && (
        <div role="alert" className="rounded-sm bg-red-soft px-3 py-2 text-sm text-foreground">
          {banner}
        </div>
      )}

      <TextField
        label={t('sessions.create.fields.title')}
        {...register('title')}
        error={errors.title?.message ? t(errors.title.message) : undefined}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          {t('sessions.create.fields.description')}
        </label>
        <textarea
          id="description"
          rows={4}
          {...register('description')}
          className="rounded-sm border border-border bg-card px-3 py-2 text-base outline-none transition focus:ring-2 focus:ring-blue"
        />
        {errors.description?.message && (
          <span role="alert" className="text-sm text-red">
            {t(errors.description.message)}
          </span>
        )}
      </div>

      <Controller
        control={control}
        name="game"
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <GameTypeahead
            label={t('sessions.create.fields.game')}
            value={(field.value as GameSearchResult | null) ?? null}
            onChange={(g) => field.onChange(g)}
            error={fieldState.error ? t('sessions.errors.required') : undefined}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField
          label={t('sessions.filters.province')}
          placeholder="—"
          options={(provincesQuery.data ?? []).map((p) => ({ value: p.code, label: p.name }))}
          disabled={provincesQuery.isLoading}
          {...register('provinceCode', {
            onChange: () => {
              setValue('cityCode', '')
              setValue('areaCode', '')
            },
          })}
          error={errors.provinceCode?.message ? t(errors.provinceCode.message) : undefined}
        />
        <SelectField
          label={t('sessions.filters.city')}
          placeholder="—"
          options={(citiesQuery.data ?? []).map((c) => ({ value: c.code, label: c.name }))}
          disabled={!provinceCode || citiesQuery.isLoading}
          {...register('cityCode', { onChange: () => setValue('areaCode', '') })}
          error={errors.cityCode?.message ? t(errors.cityCode.message) : undefined}
        />
        <SelectField
          label={t('sessions.filters.area')}
          placeholder="—"
          options={(areasQuery.data ?? []).map((a) => ({ value: a.code, label: a.name }))}
          disabled={!cityCode || areasQuery.isLoading}
          {...register('areaCode')}
          error={errors.areaCode?.message ? t(errors.areaCode.message) : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label={t('sessions.create.fields.scheduledAt')}
          type="datetime-local"
          {...register('scheduledAt')}
          error={errors.scheduledAt?.message ? t(errors.scheduledAt.message) : undefined}
        />
        <TextField
          label={
            selectedGame?.minPlayers != null && selectedGame?.maxPlayers != null
              ? `${t('sessions.create.fields.maxPlayers')} (${selectedGame.minPlayers}–${selectedGame.maxPlayers})`
              : t('sessions.create.fields.maxPlayers')
          }
          type="number"
          min={selectedGame?.minPlayers ?? 2}
          max={selectedGame?.maxPlayers ?? 20}
          {...register('maxPlayers')}
          error={errors.maxPlayers?.message ? t(errors.maxPlayers.message) : undefined}
        />
      </div>

      <Button type="submit" isLoading={mutation.isPending || isSubmitting}>
        {mutation.isPending ? t('sessions.create.submitting') : t('sessions.create.submit')}
      </Button>
    </form>
  )
}
