import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'

import { sessionsApi } from '../api/sessionsApi'
import type {
  ChangeStatusRequest,
  CreateSessionRequest,
  SessionDetail,
  SessionSearchParams,
  UpdateSessionRequest,
} from '../types/session.types'

/**
 * Query keys centralizadas para que las invalidaciones sean consistentes.
 * Patrón inspirado en https://tkdodo.eu/blog/effective-react-query-keys
 */
export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (params: SessionSearchParams) => [...sessionKeys.lists(), params] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  // Include the current locale so a language switch invalidates the cached
  // response (backend returns the summary in the active language).
  detail: (id: number) => [...sessionKeys.details(), id, i18next.language] as const,
  players: (id: number) => [...sessionKeys.detail(id), 'players'] as const,
}

/** Listado paginado y filtrado. Público. */
export function useSessionsQuery(params: SessionSearchParams = {}) {
  return useQuery({
    queryKey: sessionKeys.list(params),
    queryFn: () => sessionsApi.search(params),
    staleTime: 60_000, // 1 min — listado se refresca rápido pero no en cada navegación
  })
}

/** Detalle de una sesión. */
export function useSessionDetailQuery(id: number | undefined) {
  return useQuery({
    queryKey: id ? sessionKeys.detail(id) : ['sessions', 'detail', 'pending'],
    queryFn: () => sessionsApi.getById(id!),
    enabled: typeof id === 'number',
    staleTime: 30_000,
  })
}

/** Listado de jugadores aislado (útil para polling/refresh ligero). */
export function useSessionPlayersQuery(id: number | undefined) {
  return useQuery({
    queryKey: id ? sessionKeys.players(id) : ['sessions', 'players', 'pending'],
    queryFn: () => sessionsApi.listPlayers(id!),
    enabled: typeof id === 'number',
    staleTime: 15_000,
  })
}

// ---------- Mutations ----------

/**
 * Actualiza la cache de detail con la respuesta más reciente y la lista
 * (que pueda contener esta sesión).
 */
function syncCacheFromDetail(qc: ReturnType<typeof useQueryClient>, detail: SessionDetail) {
  qc.setQueryData(sessionKeys.detail(detail.id), detail)
  // El listado puede tener filtros distintos — invalidamos todos los lists.
  // invalidateQueries devuelve Promise pero no esperamos: fire-and-forget OK aquí.
  void qc.invalidateQueries({ queryKey: sessionKeys.lists() })
  void qc.invalidateQueries({ queryKey: sessionKeys.players(detail.id) })
}

export function useCreateSessionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSessionRequest) => sessionsApi.create(body),
    onSuccess: (detail) => syncCacheFromDetail(qc, detail),
  })
}

export function useUpdateSessionMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateSessionRequest) => sessionsApi.update(id, body),
    onSuccess: (detail) => syncCacheFromDetail(qc, detail),
  })
}

export function useChangeSessionStatusMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ChangeStatusRequest) => sessionsApi.changeStatus(id, body),
    onSuccess: (detail) => syncCacheFromDetail(qc, detail),
  })
}

export function useJoinSessionMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => sessionsApi.join(id),
    onSuccess: (detail) => syncCacheFromDetail(qc, detail),
  })
}

export function useLeaveSessionMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => sessionsApi.leave(id),
    onSuccess: (detail) => syncCacheFromDetail(qc, detail),
  })
}
