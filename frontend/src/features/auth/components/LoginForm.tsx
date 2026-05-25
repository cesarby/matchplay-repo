import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import type { ApiError } from '@/shared/api/ApiError'
import { Button } from '@/shared/components/Button'
import { TextField } from '@/shared/components/TextField'

import { useLoginMutation } from '../hooks/useLoginMutation'
import { mapAuthError } from '../lib/errorMapping'

const loginSchema = z.object({
  email: z.string().min(1, 'auth.email.required').email('auth.email.invalid'),
  password: z.string().min(1, 'auth.password.required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'code' in value && 'status' in value
}

export function LoginForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mutation = useLoginMutation()
  const [banner, setBanner] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    mode: 'onSubmit',
  })

  const onSubmit = handleSubmit((raw) => {
    const parsed = loginSchema.safeParse(raw)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field === 'email' || field === 'password') {
          setError(field, { message: issue.message })
        }
      }
      return
    }
    setBanner(null)
    mutation.mutate(parsed.data, {
      onSuccess: () => {
        const from = params.get('from')
        // Solo aceptamos rutas internas que NO sean /login ni /register para
        // evitar bucles. Por defecto la pantalla principal del usuario
        // autenticado es el listado de partidas.
        const safeFrom =
          from &&
          from.startsWith('/') &&
          !from.startsWith('/login') &&
          !from.startsWith('/register')
            ? from
            : '/sessions'
        navigate(safeFrom, { replace: true })
      },
      onError: (err) => {
        if (!isApiError(err)) {
          setBanner(t('auth.errors.generic'))
          return
        }
        const mapping = mapAuthError(err)
        if (
          mapping.channel === 'field' &&
          (mapping.field === 'email' || mapping.field === 'password')
        ) {
          setError(mapping.field, { message: t(mapping.i18nKey) })
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
        // Foco inicial intencional: pantalla dedicada a login, único campo de entrada esperado.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        {...register('email')}
        error={errors.email?.message ? t(errors.email.message) : undefined}
      />
      <TextField
        label={t('auth.password.label')}
        type="password"
        autoComplete="current-password"
        {...register('password')}
        error={errors.password?.message ? t(errors.password.message) : undefined}
      />
      <Button type="submit" isLoading={mutation.isPending || isSubmitting}>
        {mutation.isPending ? t('auth.login.submitting') : t('auth.login.submit')}
      </Button>
    </form>
  )
}
