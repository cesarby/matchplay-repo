import { httpClient } from '@/shared/api/httpClient'

import type { MySessionsResponse, MyTab } from '../types/session.types'

// Relativo al baseURL del httpClient (VITE_API_BASE_URL = '/api/v1').
const BASE = '/me/sessions'

export const mySessionsApi = {
  findMine: (tab: MyTab, page = 0, size = 20): Promise<MySessionsResponse> =>
    httpClient.get<MySessionsResponse>(BASE, { params: { tab, page, size } }).then((r) => r.data),
}
