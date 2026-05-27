import { MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import type { SessionDetail } from '../types/session.types'

import { SessionChatDrawer } from './SessionChatDrawer'

interface SessionChatButtonProps {
  session: SessionDetail
}

/**
 * Bloque del chat en la sidebar de la detail page. Tres estados exclusivos:
 *
 * 1. **Participante** (chatUnreadCount !== null): card-banner clicable con borde
 *    rojo, contador total + badge de no leídos. Click abre el drawer.
 * 2. **Outsider con sesión activa** (chatUnreadCount === null && chatMessageCount !== null):
 *    caja informativa NO clicable (role="note"). Solo muestra la info del chat.
 * 3. **Sesión cerrada** (chatMessageCount === null): no renderiza nada.
 */
export function SessionChatButton({ session }: SessionChatButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  // Estado 3: sesión cerrada / cancelada → no aplica el chat
  if (session.chatMessageCount === null) return null

  // Estado 2: outsider — caja informativa NO clicable
  if (session.chatUnreadCount === null) {
    return (
      <div
        role="note"
        className="flex w-full items-center gap-3 rounded-md border border-dashed border-border bg-muted/30 p-4 opacity-70"
      >
        <MessageSquare size={20} aria-hidden="true" className="text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t('sessions.chat.totalMessages', { count: session.chatMessageCount })}
          </p>
          <p className="text-xs italic text-muted-foreground">
            {t('sessions.chat.outsiderNotice', { count: session.chatMessageCount })}
          </p>
        </div>
      </div>
    )
  }

  // Estado 1: participante — card-banner clicable
  const unread = session.chatUnreadCount
  const total = session.chatMessageCount

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded border border-border bg-muted/20 p-4',
          'text-left transition hover:bg-muted/40',
        )}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={14} aria-hidden="true" className="text-muted-foreground" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('sessions.chat.title')}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('sessions.chat.totalMessages', { count: total })}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <span
            aria-label={t('sessions.chat.unreadBadge', { count: unread })}
            className="inline-flex min-w-6 items-center justify-center rounded-full bg-red px-2 py-0.5 text-xs font-bold text-white"
          >
            {unread}
          </span>
        )}
      </button>

      <SessionChatDrawer session={session} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
