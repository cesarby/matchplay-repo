import { useQuery } from '@tanstack/react-query'
import i18next from 'i18next'

import { mySessionsApi } from '../api/mySessionsApi'
import type { MyTab } from '../types/session.types'

export const mySessionsKeys = {
  all: ['my-sessions'] as const,
  list: (tab: MyTab, page: number) => [...mySessionsKeys.all, tab, page, i18next.language] as const,
}

/**
 * Listado de Mis partidas en un tab. La query key incluye `tab` y `page`,
 * así que cambiar de tab dispara un fetch nuevo con counters refrescados.
 */
export function useMySessionsQuery(tab: MyTab, page: number) {
  return useQuery({
    queryKey: mySessionsKeys.list(tab, page),
    queryFn: () => mySessionsApi.findMine(tab, page),
    staleTime: 30_000,
  })
}
