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
 * Punto de entrada al chat de coordinación de una partida. Solo visible para
 * participantes (PLAYER o WAITLIST) y para el creador — si {@code session.chatUnreadCount}
 * es null (anónimo / no participante), el componente devuelve null.
 *
 * Muestra un badge rojo con el número de mensajes no leídos. Click abre el drawer.
 */
export function SessionChatButton({ session }: SessionChatButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (session.chatUnreadCount === null) return null

  const unread = session.chatUnreadCount

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded border border-dashed border-border bg-muted/20 p-4',
          'text-left transition hover:bg-muted/40',
        )}
      >
        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <MessageSquare size={14} aria-hidden="true" />
          {t('sessions.chat.title')}
        </span>
        {unread > 0 && (
          <span
            aria-label={`${unread} ${t('sessions.chat.title').toLowerCase()}`}
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
