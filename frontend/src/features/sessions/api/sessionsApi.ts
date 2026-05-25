import { httpClient } from '@/shared/api/httpClient'
import type { PageResponse } from '@/shared/api/PageResponse'

import type {
  ChangeStatusRequest,
  CreateSessionRequest,
  SessionDetail,
  SessionPlayer,
  SessionSearchParams,
  SessionSummary,
  UpdateSessionRequest,
} from '../types/session.types'

const BASE = '/api/v1/sessions'

/**
 * Construye los query params para el search.
 * Omite valores undefined/null/'' para no mandar params vacíos.
 */
function buildSearchParams(params: SessionSearchParams = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = String(value)
  }
  return out
}

export const sessionsApi = {
  search: (params: SessionSearchParams = {}): Promise<PageResponse<SessionSummary>> =>
    httpClient
      .get<PageResponse<SessionSummary>>(BASE, { params: buildSearchParams(params) })
      .then((r) => r.data),

  getById: (id: number): Promise<SessionDetail> =>
    httpClient.get<SessionDetail>(`${BASE}/${id}`).then((r) => r.data),

  listPlayers: (id: number): Promise<SessionPlayer[]> =>
    httpClient.get<SessionPlayer[]>(`${BASE}/${id}/players`).then((r) => r.data),

  create: (body: CreateSessionRequest): Promise<SessionDetail> =>
    httpClient.post<SessionDetail>(BASE, body).then((r) => r.data),

  update: (id: number, body: UpdateSessionRequest): Promise<SessionDetail> =>
    httpClient.patch<SessionDetail>(`${BASE}/${id}`, body).then((r) => r.data),

  changeStatus: (id: number, body: ChangeStatusRequest): Promise<SessionDetail> =>
    httpClient.patch<SessionDetail>(`${BASE}/${id}/status`, body).then((r) => r.data),

  join: (id: number): Promise<SessionDetail> =>
    httpClient.post<SessionDetail>(`${BASE}/${id}/join`).then((r) => r.data),

  leave: (id: number): Promise<SessionDetail> =>
    httpClient.delete<SessionDetail>(`${BASE}/${id}/join`).then((r) => r.data),
}
