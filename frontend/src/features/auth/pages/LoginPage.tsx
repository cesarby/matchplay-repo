import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import { SeoHead } from '@/shared/components/SeoHead'

import { LoginForm } from '../components/LoginForm'

export default function LoginPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  // Capturamos el reason en estado al montar. El banner se muestra solo en
  // esta navegación; tras un refresh ya no aparece porque limpiamos el
  // query param justo después.
  const [sessionExpired] = useState(() => params.get('reason') === 'session-expired')

  useEffect(() => {
    if (params.get('reason') === 'session-expired') {
      const next = new URLSearchParams(params)
      next.delete('reason')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <SeoHead title={t('seo.login.title')} description={t('seo.login.description')} noindex />
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold">{t('auth.login.title')}</h1>
      </header>
      {sessionExpired && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-sm bg-yellow-soft px-3 py-2 text-sm text-foreground"
        >
          {t('auth.session.expired')}
        </div>
      )}
      <LoginForm />
      <p className="text-sm text-muted-foreground">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="font-medium text-blue underline">
          {t('auth.login.registerCta')}
        </Link>
      </p>
    </div>
  )
}
