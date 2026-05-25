import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAreasQuery, useCitiesQuery, useProvincesQuery } from '@/features/geo/hooks/useGeo'
import type { ApiError } from '@/shared/api/ApiError'
import { Button } from '@/shared/components/Button'
import { SelectField } from '@/shared/components/SelectField'
import { TextField } from '@/shared/components/TextField'

import { useRegisterMutation } from '../hooks/useRegisterMutation'
import { mapAuthError } from '../lib/errorMapping'

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const registerSchema = z.object({
  email: z.string().email('auth.email.invalid').max(150),
  username: z.string().min(3, 'auth.username.min').max(50),
  password: z.string().regex(PASSWORD_REGEX, 'auth.password.weak'),
  name: z.string().min(1, 'auth.name.required').max(100),
  provinceCode: z.string().min(1, 'auth.province.required'),
  cityCode: z.string().min(1, 'auth.city.required'),
  areaCode: z.string().min(1, 'auth.area.required'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

type RegisterFieldName = keyof RegisterFormValues

const ALLOWED_FIELDS: RegisterFieldName[] = [
  'email',
  'username',
  'password',
  'name',
  'provinceCode',
  'cityCode',
  'areaCode',
]

function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'code' in value && 'status' in value
}

export function RegisterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mutation = useRegisterMutation()
  const [banner, setBanner] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>()

  const provinceCode = watch('provinceCode')
  const cityCode = watch('cityCode')

  const provincesQuery = useProvincesQuery()
  const citiesQuery = useCitiesQuery(provinceCode)
  const areasQuery = useAreasQuery(cityCode)

  const onSubmit = handleSubmit((raw) => {
    const parsed = registerSchema.safeParse(raw)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string' && (ALLOWED_FIELDS as string[]).includes(field)) {
          setError(field as RegisterFieldName, { message: issue.message })
        }
      }
      return
    }
    setBanner(null)
    mutation.mutate(parsed.data, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (err) => {
        if (!isApiError(err)) {
          setBanner(t('auth.errors.generic'))
          return
        }
        if (err.fieldErrors) {
          for (const fe of err.fieldErrors) {
            if ((ALLOWED_FIELDS as string[]).includes(fe.field)) {
              setError(fe.field as RegisterFieldName, { message: fe.message })
            }
          }
          return
        }
        const mapping = mapAuthError(err)
        if (mapping.channel === 'field' && (ALLOWED_FIELDS as string[]).includes(mapping.field)) {
          setError(mapping.field as RegisterFieldName, { message: t(mapping.i18nKey) })
          return
        }
        setBanner(err.message || t(mapping.i18nKey))
      },
    })
  })

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {banner && (
        <div role="alert" className="rounded-sm bg-red-soft px-3 py-2 text-sm text-red">
          {banner}
        </div>
      )}
      <TextField
        label={t('auth.email.label')}
        type="email"
        autoComplete="email"
        // Foco inicial intencional: pantalla dedicada a registro.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        {...register('email')}
        error={errors.email?.message ? t(errors.email.message) : undefined}
      />
      <TextField
        label={t('auth.username.label')}
        autoComplete="username"
        {...register('username')}
        error={errors.username?.message ? t(errors.username.message) : undefined}
      />
      <TextField
        label={t('auth.password.label')}
        type="password"
        autoComplete="new-password"
        {...register('password')}
        error={errors.password?.message ? t(errors.password.message) : undefined}
      />
      <TextField
        label={t('auth.name.label')}
        autoComplete="name"
        {...register('name')}
        error={errors.name?.message ? t(errors.name.message) : undefined}
      />

      <SelectField
        label={t('auth.province.label')}
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
        label={t('auth.city.label')}
        placeholder="—"
        options={(citiesQuery.data ?? []).map((c) => ({ value: c.code, label: c.name }))}
        disabled={!provinceCode || citiesQuery.isLoading}
        {...register('cityCode', {
          onChange: () => setValue('areaCode', ''),
        })}
        error={errors.cityCode?.message ? t(errors.cityCode.message) : undefined}
      />
      <SelectField
        label={t('auth.area.label')}
        placeholder="—"
        options={(areasQuery.data ?? []).map((a) => ({ value: a.code, label: a.name }))}
        disabled={!cityCode || areasQuery.isLoading}
        {...register('areaCode')}
        error={errors.areaCode?.message ? t(errors.areaCode.message) : undefined}
      />

      <Button type="submit" isLoading={mutation.isPending || isSubmitting}>
        {mutation.isPending ? t('auth.register.submitting') : t('auth.register.submit')}
      </Button>
    </form>
  )
}
