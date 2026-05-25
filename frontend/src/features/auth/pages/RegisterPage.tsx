import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { SeoHead } from '@/shared/components/SeoHead'

import { RegisterForm } from '../components/RegisterForm'

export default function RegisterPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <SeoHead
        title={t('seo.register.title')}
        description={t('seo.register.description')}
        noindex
      />
      <header>
        <h1 className="font-display text-3xl font-semibold">{t('auth.register.title')}</h1>
      </header>
      <RegisterForm />
      <p className="text-sm text-muted-foreground">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-blue underline">
          {t('auth.register.loginCta')}
        </Link>
      </p>
    </div>
  )
}
