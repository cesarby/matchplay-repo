import { useTranslation } from 'react-i18next'

import { SeoHead } from '@/shared/components/SeoHead'

export default function HelpPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SeoHead title={`${t('help.title')} | Match&Play`} description={t('help.intro')} />
      <h1 className="mb-4 font-display text-2xl font-bold sm:text-3xl">{t('help.title')}</h1>
      <p className="mb-4 text-base text-foreground">{t('help.intro')}</p>
      <p className="text-sm text-muted-foreground">
        {t('help.contactEmail')}:{' '}
        <a href="mailto:soporte@matchandplay.com" className="text-red hover:underline">
          soporte@matchandplay.com
        </a>
      </p>
    </div>
  )
}
