import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/shared/lib/cn'

import {
  useChatMessagesQuery,
  useMarkChatReadMutation,
  useSendMessageMutation,
} from '../hooks/useChatMessages'
import type { SessionDetail } from '../types/session.types'

import { ChatMessageRow } from './ChatMessageRow'

interface SessionChatDrawerProps {
  session: SessionDetail
  open: boolean
  onClose: () => void
}

/**
 * Drawer/modal del chat de una partida. Polling 20s mientras está abierto.
 * Al abrir: marca como leído (optimistic). WAITLIST ve mensajes pero no puede
 * escribir (input oculto, solo aviso).
 */
export function SessionChatDrawer({ session, open, onClose }: SessionChatDrawerProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [draft, setDraft] = useState('')

  const isWaitlist = session.yourRole === 'WAITLIST'

  const { data: messages, isLoading, isError } = useChatMessagesQuery(session.id, open)
  const markRead = useMarkChatReadMutation(session.id)
  const sendMessage = useSendMessageMutation(
    session.id,
    user ? { id: user.userId, username: user.username } : { id: 0, username: '' },
  )

  // Mark read al abrir
  useEffect(() => {
    if (open) markRead.mutate()
    // intencionalmente sin markRead en deps — solo al cambiar open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Close con Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Auto-scroll al fondo SOLO si el usuario ya está cerca del fondo —
  // no le arrancamos de donde está leyendo si ha scrolleado hacia arriba.
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages, open])

  if (!open) return null

  function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed.length > 500) return
    sendMessage.mutate(trimmed, {
      onSuccess: () => setDraft(''),
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const counter = `${draft.length}/500`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-drawer-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40"
      />
      <div
        className={cn(
          'relative flex h-full w-full flex-col bg-card shadow-xl',
          'sm:max-w-[420px] sm:border-l-2 sm:border-border',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="chat-drawer-title" className="font-display text-lg font-bold text-foreground">
            {t('sessions.chat.headerTitle', { session: session.title })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Lista de mensajes */}
        <ul
          ref={listRef}
          className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
          aria-live="polite"
        >
          {isLoading && <li className="text-center text-sm text-muted-foreground">…</li>}
          {isError && (
            <li className="text-center text-sm text-red">{t('sessions.chat.loadError')}</li>
          )}
          {!isLoading && !isError && (messages?.length ?? 0) === 0 && (
            <li className="text-center text-sm italic text-muted-foreground">
              {t('sessions.chat.empty')}
            </li>
          )}
          {messages?.map((m) => (
            <ChatMessageRow
              key={m.id}
              message={m}
              mine={user != null && m.userId === user.userId}
            />
          ))}
        </ul>

        {/* Footer */}
        <div className="border-t border-border p-3">
          {isWaitlist ? (
            <p className="text-center text-sm italic text-muted-foreground">
              {t('sessions.chat.waitlistNotice')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('sessions.chat.inputPlaceholder')}
                maxLength={500}
                rows={2}
                className="w-full resize-none rounded border-2 border-border bg-card px-3 py-2 text-sm outline-none focus:border-red focus:ring-2 focus:ring-yellow/30"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{counter}</span>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={draft.trim().length === 0 || sendMessage.isPending}
                  className="rounded-md bg-red px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {t('sessions.chat.send')}
                </button>
              </div>
              {sendMessage.isError && (
                <p className="text-xs text-red">{t('sessions.chat.sendError')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
