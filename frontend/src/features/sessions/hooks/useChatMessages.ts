import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'

import { messagesApi } from '../api/messagesApi'
import type { SessionDetail, SessionMessage } from '../types/session.types'

import { sessionKeys } from './useSessions'

const POLL_INTERVAL_MS = 20_000

export const chatKeys = {
  all: ['chat'] as const,
  messages: (sessionId: number) =>
    [...chatKeys.all, 'messages', sessionId, i18next.language] as const,
}

/**
 * Polling de mensajes mientras el drawer del chat está abierto.
 * `enabled=false` detiene el polling al cerrar el drawer.
 * La query key incluye `i18next.language` para alinear con el patrón del
 * detail (aunque los mensajes no son locale-aware, mantiene consistencia
 * y futureproofing si en el futuro hay traducciones).
 */
export function useChatMessagesQuery(sessionId: number, enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.messages(sessionId),
    queryFn: () => messagesApi.list(sessionId),
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
    staleTime: 0,
  })
}

/**
 * Envía un mensaje. Optimistic update: inserta una versión temporal con id
 * negativo y la reemplaza por la real al recibir respuesta. Rollback en error.
 */
export function useSendMessageMutation(
  sessionId: number,
  currentUser: { id: number; username: string },
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => messagesApi.send(sessionId, content),
    onMutate: async (content: string) => {
      await qc.cancelQueries({ queryKey: chatKeys.messages(sessionId) })
      const previous = qc.getQueryData<SessionMessage[]>(chatKeys.messages(sessionId)) ?? []
      const optimistic: SessionMessage = {
        id: -Date.now(), // id temporal negativo (no choca con reales)
        userId: currentUser.id,
        username: currentUser.username,
        content,
        createdAt: new Date().toISOString(),
      }
      qc.setQueryData<SessionMessage[]>(chatKeys.messages(sessionId), [...previous, optimistic])
      return { previous, optimisticId: optimistic.id }
    },
    onError: (_err, _content, ctx) => {
      if (ctx) qc.setQueryData(chatKeys.messages(sessionId), ctx.previous)
    },
    onSuccess: (real, _content, ctx) => {
      qc.setQueryData<SessionMessage[]>(chatKeys.messages(sessionId), (curr) => {
        const list = curr ?? []
        // reemplaza el optimista por el real
        return list.map((m) => (m.id === ctx?.optimisticId ? real : m))
      })
    },
  })
}

/**
 * Marca el chat como leído. Pone optimísticamente chatUnreadCount=0 en la
 * cache del detail para que el badge desaparezca instantáneo.
 */
export function useMarkChatReadMutation(sessionId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => messagesApi.markRead(sessionId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: sessionKeys.detail(sessionId) })
      const previous = qc.getQueryData<SessionDetail>(sessionKeys.detail(sessionId))
      if (previous && previous.chatUnreadCount !== null) {
        qc.setQueryData<SessionDetail>(sessionKeys.detail(sessionId), {
          ...previous,
          chatUnreadCount: 0,
        })
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(sessionKeys.detail(sessionId), ctx.previous)
    },
  })
}
