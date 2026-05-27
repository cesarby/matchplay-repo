import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Placeholder visual del futuro chat entre jugadores apuntados.
 * No interactivo todavía — la feature se implementará en una iteración futura.
 */
export function SessionChatPlaceholder() {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="chat-heading"
      className="rounded border border-dashed border-border bg-muted/20 p-4"
    >
      <h2
        id="chat-heading"
        className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"
      >
        <MessageSquare size={14} aria-hidden="true" />
        {t('sessions.detail.chatHeading')}
      </h2>
      <p className="text-sm italic text-muted-foreground">{t('sessions.detail.chatComingSoon')}</p>
    </section>
  )
}
