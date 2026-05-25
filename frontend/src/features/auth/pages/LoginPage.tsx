import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import { LoginForm } from '../components/LoginForm'

export default function LoginPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const sessionExpired = params.get('reason') === 'session-expired'

  return (
    <div className="space-y-6">
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
