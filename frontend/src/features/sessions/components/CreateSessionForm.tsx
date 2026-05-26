import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { GameWithExpansionsPicker } from '@/features/games/components/GameWithExpansionsPicker'
import type { GameSearchResult } from '@/features/games/types/game.types'
import { useAreasQuery, useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'
import type { ApiError } from '@/shared/api/ApiError'
import { Button } from '@/shared/components/Button'
import { SelectField } from '@/shared/components/SelectField'
import { TextField } from '@/shared/components/TextField'

import { useCreateSessionMutation } from '../hooks/useSessions'
import { mapSessionError } from '../lib/errorMapping'
import type { CreateSessionRequest } from '../types/session.types'

import { SessionDateTimePicker } from './SessionDateTimePicker'

const DESCRIPTION_MAX = 500

/**
 * Schema de validación cliente para Create.
 *
 * Reglas de obligatoriedad (regla de producto):
 *   Todos los campos son obligatorios EXCEPTO {@code description}.
 *
 * Las claves de error son keys i18n (se resuelven en render con t()).
 */
const schema = z.object({
  title: z.string().min(1, 'sessions.errors.required').max(150, 'sessions.errors.tooLong'),
  description: z.string().max(DESCRIPTION_MAX, 'sessions.errors.tooLong').optional(),
  game: z.object({
    bggId: z.number(),
    name: z.string(),
    minPlayers: z.number().nullable(),
    maxPlayers: z.number().nullable(),
  }),
  expansions: z
    .array(z.object({ bggId: z.number(), name: z.string() }))
    .max(20, 'sessions.errors.tooLong'),
  provinceCode: z.string().min(1, 'sessions.errors.required'),
  cityCode: z.string().min(1, 'sessions.errors.required'),
  areaCode: z.string().min(1, 'sessions.errors.required'),
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
    .number({ invalid_type_error: 'sessions.errors.required' })
    .int()
    .min(2, 'sessions.errors.maxBelowGameMin')
    .max(20, 'sessions.errors.maxAboveGame'),
  creatorGuests: z.coerce
    .number({ invalid_type_error: 'sessions.errors.required' })
    .int()
    .min(0, 'sessions.errors.guestsNegative')
    .max(19, 'sessions.errors.guestsExceedMax'),
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
  'creatorGuests',
]

function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'code' in value && 'status' in value
}

export function CreateSessionForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mutation = useCreateSessionMutation()
  const { user } = useAuth()
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
      expansions: [],
      provinceCode: '',
      cityCode: '',
      areaCode: '',
      scheduledAt: '',
      maxPlayers: 4,
      creatorGuests: 0,
    },
  })

  const provinceCode = watch('provinceCode')
  const cityCode = watch('cityCode')
  const selectedGame = watch('game') as GameSearchResult | undefined
  const descriptionValue = watch('description') ?? ''

  const provincesQuery = useProvincesQuery()
  const citiesQuery = useCitiesQuery(provinceCode)
  const areasQuery = useAreasQuery(cityCode)

  // 1) Prefill de localización en cascada.
  //    Cada nivel espera a que su query (cities depende de province,
  //    areas depende de city) traiga la opción correspondiente del usuario
  //    antes de hacer setValue. Si no, el <select> uncontrolled descarta
  //    el value cuando todavía no existe esa opción y el campo queda vacío.
  useEffect(() => {
    if (user?.provinceCode) setValue('provinceCode', user.provinceCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId])

  useEffect(() => {
    if (!user?.cityCode) return
    const cities = citiesQuery.data ?? []
    if (cities.some((c) => c.code === user.cityCode)) {
      setValue('cityCode', user.cityCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, citiesQuery.data])

  useEffect(() => {
    if (!user?.areaCode) return
    const areas = areasQuery.data ?? []
    if (areas.some((a) => a.code === user.areaCode)) {
      setValue('areaCode', user.areaCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, areasQuery.data])

  // 2) Plazas se autocompletan con el máximo del juego al seleccionar uno.
  //    Si el juego no aporta maxPlayers (cooperativos), no tocamos el valor.
  useEffect(() => {
    if (selectedGame?.maxPlayers != null) {
      setValue('maxPlayers', selectedGame.maxPlayers, { shouldValidate: false })
    }
  }, [selectedGame?.bggId, selectedGame?.maxPlayers, setValue])

  // 3) El SessionDateTimePicker se ocupa internamente de bloquear días
  //    anteriores a hoy. La validación de "estrictamente futura" la refuerza
  //    el schema en submit.

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

    // Cross-field check: 1 (creador) + acompañantes ≤ maxPlayers.
    if (1 + parsed.data.creatorGuests > parsed.data.maxPlayers) {
      setError('creatorGuests', { message: 'sessions.errors.guestsExceedMax' })
      return
    }

    const body: CreateSessionRequest = {
      title: parsed.data.title,
      description: parsed.data.description?.trim() || null,
      baseGameId: parsed.data.game.bggId,
      expansionBggIds: parsed.data.expansions.map((e) => e.bggId),
      cityCode: parsed.data.cityCode,
      areaCode: parsed.data.areaCode?.trim() || null,
      // datetime-local da "2030-01-15T20:00" — el navegador lo asume local.
      // toISOString lo lleva a Instant (UTC) que es lo que espera el backend.
      scheduledAt: new Date(parsed.data.scheduledAt).toISOString(),
      maxPlayers: parsed.data.maxPlayers,
      creatorGuests: parsed.data.creatorGuests,
    }

    mutation.mutate(body, {
      onSuccess: (created) => navigate(`/sessions/${created.id}`),
      onError: (err) => {
        if (!isApiError(err)) {
          setBanner(t('auth.errors.generic'))
          return
        }
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
        <div className="flex items-baseline justify-between">
          <label htmlFor="description" className="text-sm font-medium">
            {t('sessions.create.fields.description')}
          </label>
          <span
            className={
              descriptionValue.length > DESCRIPTION_MAX
                ? 'text-xs text-red'
                : 'text-xs text-muted-foreground'
            }
            aria-live="polite"
          >
            {descriptionValue.length} / {DESCRIPTION_MAX}
          </span>
        </div>
        <textarea
          id="description"
          rows={4}
          maxLength={DESCRIPTION_MAX}
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
        render={({ field: gameField, fieldState: gameFieldState }) => (
          <Controller
            control={control}
            name="expansions"
            render={({ field: expField }) => (
              <GameWithExpansionsPicker
                baseGame={(gameField.value as GameSearchResult | null) ?? null}
                onBaseGameChange={(g) => gameField.onChange(g)}
                expansions={(expField.value as GameSearchResult[]) ?? []}
                onExpansionsChange={(list) => expField.onChange(list)}
                baseLabel={t('sessions.create.fields.game')}
                expansionsLabel={t('sessions.create.fields.expansions')}
                basePlaceholder={t('sessions.create.fields.gamePlaceholder')}
                expansionPlaceholder={t('sessions.create.fields.expansionsPlaceholder')}
                baseError={gameFieldState.error ? t('sessions.errors.required') : undefined}
              />
            )}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <Controller
          control={control}
          name="scheduledAt"
          render={({ field, fieldState }) => (
            <SessionDateTimePicker
              label={t('sessions.create.fields.scheduledAt')}
              value={field.value ?? ''}
              onChange={field.onChange}
              error={fieldState.error?.message ? t(fieldState.error.message) : undefined}
            />
          )}
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
        <div className="flex flex-col gap-1">
          <TextField
            label={t('sessions.create.fields.creatorGuests')}
            type="number"
            min={0}
            max={Math.max(0, (watch('maxPlayers') ?? 2) - 1)}
            {...register('creatorGuests')}
            error={errors.creatorGuests?.message ? t(errors.creatorGuests.message) : undefined}
          />
          <span className="text-xs text-muted-foreground">
            {t('sessions.create.fields.creatorGuestsHelp')}
          </span>
        </div>
      </div>

      <Button type="submit" isLoading={mutation.isPending || isSubmitting}>
        {mutation.isPending ? t('sessions.create.submitting') : t('sessions.create.submit')}
      </Button>
    </form>
  )
}
