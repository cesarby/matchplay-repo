import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">{t('home.title')}</h1>
      <p className="text-muted-foreground">{t('home.subtitle')}</p>
    </div>
  )
}
