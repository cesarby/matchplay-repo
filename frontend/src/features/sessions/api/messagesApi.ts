import { httpClient } from '@/shared/api/httpClient'

import type { SessionMessage } from '../types/session.types'

const BASE = '/sessions'

export const messagesApi = {
  list: (sessionId: number, since?: string): Promise<SessionMessage[]> => {
    const params = since ? { since } : undefined
    return httpClient
      .get<SessionMessage[]>(`${BASE}/${sessionId}/messages`, { params })
      .then((r) => r.data)
  },

  send: (sessionId: number, content: string): Promise<SessionMessage> =>
    httpClient
      .post<SessionMessage>(`${BASE}/${sessionId}/messages`, { content })
      .then((r) => r.data),

  markRead: (sessionId: number): Promise<void> =>
    httpClient.post<void>(`${BASE}/${sessionId}/messages/mark-read`).then(() => undefined),
}
