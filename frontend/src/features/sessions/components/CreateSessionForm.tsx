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
import { SelectField } from '@/shared/components/SelectField'
import { TextField } from '@/shared/components/TextField'
import { cn } from '@/shared/lib/cn'

import { useCreateSessionMutation } from '../hooks/useSessions'
import { mapSessionError } from '../lib/errorMapping'
import type { CreateSessionRequest } from '../types/session.types'

import { SessionDateTimePicker } from './SessionDateTimePicker'
import { SessionLivePreview } from './SessionLivePreview'

const DESCRIPTION_MAX = 500

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

/**
 * Form de creación de partida con layout "live preview" (Opción B):
 *
 * - **Escritorio (≥lg)**: dos columnas — form izquierda (panel card con
 *   secciones separadas por dashed) + preview sticky a la derecha.
 * - **Móvil**: mini-card gradient arriba (resumen vivo) + form abajo + el
 *   submit (publish bar) al final.
 *
 * El preview se construye en tiempo real desde {@code watch()} y reusa la
 * {@link SessionCard} real para que el usuario vea exactamente cómo
 * aparecerá su partida.
 */
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

  const titleValue = watch('title')
  const provinceCode = watch('provinceCode')
  const cityCode = watch('cityCode')
  const areaCode = watch('areaCode')
  const selectedGame = watch('game') as GameSearchResult | undefined
  const selectedExpansions = (watch('expansions') as GameSearchResult[] | undefined) ?? []
  const descriptionValue = watch('description') ?? ''
  const scheduledAtValue = watch('scheduledAt')
  const maxPlayersValue = Number(watch('maxPlayers') ?? 4)
  const creatorGuestsValue = Number(watch('creatorGuests') ?? 0)

  const provincesQuery = useProvincesQuery()
  const citiesQuery = useCitiesQuery(provinceCode)
  const areasQuery = useAreasQuery(cityCode)

  // 1) Prefill de localización en cascada.
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

  // 2) Plazas se autocompletan con el max del juego seleccionado.
  useEffect(() => {
    if (selectedGame?.maxPlayers != null) {
      setValue('maxPlayers', selectedGame.maxPlayers, { shouldValidate: false })
    }
  }, [selectedGame?.bggId, selectedGame?.maxPlayers, setValue])

  // Resolución de nombres geo para el preview (los selects sólo guardan códigos)
  const cityName = citiesQuery.data?.find((c) => c.code === cityCode)?.name
  const areaName = areasQuery.data?.find((a) => a.code === areaCode)?.name

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

    if (1 + parsed.data.creatorGuests >= parsed.data.maxPlayers) {
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

  const isPending = mutation.isPending || isSubmitting

  return (
    <form noValidate onSubmit={onSubmit}>
      {/* Header de la página + live badge */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red">
            {t('sessions.create.title')}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {t('sessions.create.heroTitle')}
          </h1>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-red-soft px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-red sm:inline-flex">
          <span className="size-1.5 animate-pulse rounded-full bg-red" />
          {t('sessions.create.livePreview')}
        </span>
      </div>

      {banner && (
        <div role="alert" className="mb-4 rounded-sm bg-red-soft px-3 py-2 text-sm text-foreground">
          {banner}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ============ FORM PANEL (izquierda) ============ */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-warm sm:p-7">
          {/* Sección 1 — Información */}
          <FormSection
            number="01"
            total="04"
            name={t('sessions.create.sections.info')}
            dotColor="bg-red"
          >
            <div className="flex flex-col gap-3">
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
                    className={cn(
                      'text-xs',
                      descriptionValue.length > DESCRIPTION_MAX
                        ? 'text-red'
                        : 'text-muted-foreground',
                    )}
                    aria-live="polite"
                  >
                    {descriptionValue.length} / {DESCRIPTION_MAX}
                  </span>
                </div>
                <textarea
                  id="description"
                  rows={3}
                  maxLength={DESCRIPTION_MAX}
                  {...register('description')}
                  className="rounded-sm border border-border bg-background px-3 py-2 text-base outline-none transition focus:ring-2 focus:ring-blue"
                />
                {errors.description?.message && (
                  <span role="alert" className="text-sm text-red">
                    {t(errors.description.message)}
                  </span>
                )}
              </div>
            </div>
          </FormSection>

          {/* Sección 2 — Juego */}
          <FormSection
            number="02"
            total="04"
            name={t('sessions.create.sections.game')}
            dotColor="bg-blue"
          >
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
          </FormSection>

          {/* Sección 3 — Ubicación */}
          <FormSection
            number="03"
            total="04"
            name={t('sessions.create.sections.location')}
            dotColor="bg-green"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          </FormSection>

          {/* Sección 4 — Cuándo y cuántos */}
          <FormSection
            number="04"
            total="04"
            name={t('sessions.create.sections.when')}
            dotColor="bg-yellow"
            last
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end lg:grid-cols-[2fr_1fr_1fr]">
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
              <TextField
                label={t('sessions.create.fields.creatorGuests')}
                type="number"
                min={0}
                max={Math.max(0, maxPlayersValue - 2)}
                {...register('creatorGuests')}
                error={errors.creatorGuests?.message ? t(errors.creatorGuests.message) : undefined}
              />
            </div>
          </FormSection>
        </div>

        {/* ============ LIVE PREVIEW (derecha, sticky en desktop) ============ */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SessionLivePreview
            title={titleValue}
            baseGame={selectedGame ?? null}
            expansionCount={selectedExpansions.length}
            cityName={cityName}
            areaName={areaName}
            scheduledAt={scheduledAtValue}
            maxPlayers={maxPlayersValue}
            creatorGuests={creatorGuestsValue}
            creator={user ? { userId: user.userId, username: user.username } : null}
            isPending={isPending}
          />
        </aside>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// FormSection — bloque de form con dot indicator + nombre + contador
// ---------------------------------------------------------------------------

interface FormSectionProps {
  number: string
  total: string
  name: string
  dotColor: string
  last?: boolean
  children: React.ReactNode
}

function FormSection({ number, total, name, dotColor, last = false, children }: FormSectionProps) {
  return (
    <div className={cn(!last && 'mb-6 border-b border-dashed border-border pb-6')}>
      <div className="mb-4 flex items-center gap-2.5">
        <span aria-hidden="true" className={cn('size-2 rounded-full', dotColor)} />
        <span className="font-display text-sm font-bold uppercase tracking-[0.08em] text-foreground">
          {name}
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {number} / {total}
        </span>
      </div>
      {children}
    </div>
  )
}
