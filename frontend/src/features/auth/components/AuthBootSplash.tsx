import { useTranslation } from 'react-i18next'

export function AuthBootSplash() {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh items-center justify-center bg-background"
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <span
          aria-hidden
          className="size-3 animate-pulse rounded-full bg-red"
          style={{ animationDelay: '0ms' }}
        />
        <span
          aria-hidden
          className="size-3 animate-pulse rounded-full bg-blue"
          style={{ animationDelay: '120ms' }}
        />
        <span
          aria-hidden
          className="size-3 animate-pulse rounded-full bg-green"
          style={{ animationDelay: '240ms' }}
        />
        <span
          aria-hidden
          className="size-3 animate-pulse rounded-full bg-yellow"
          style={{ animationDelay: '360ms' }}
        />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    </div>
  )
}
