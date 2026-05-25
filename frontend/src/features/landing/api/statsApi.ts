import { httpClient } from '@/shared/api/httpClient'

import type { PublicStats } from '../types/landing.types'

export const statsApi = {
  getPublic: (): Promise<PublicStats> =>
    httpClient.get<PublicStats>('/api/v1/stats/public').then((r) => r.data),
}
