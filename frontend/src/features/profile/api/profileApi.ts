import { httpClient } from '@/shared/api/httpClient'

import type { UpdateProfilePayload, UserProfile } from '../types/profile.types'

export const profileApi = {
  get: (): Promise<UserProfile> => httpClient.get<UserProfile>('/me/profile').then((r) => r.data),

  update: (payload: UpdateProfilePayload): Promise<UserProfile> => {
    // Strip campos internos del optimistic update — el backend no los entiende.
    const { _favoriteGamesOptimistic: _opt, ...body } = payload
    return httpClient.patch<UserProfile>('/me/profile', body).then((r) => r.data)
  },

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    httpClient.post('/me/profile/password', { currentPassword, newPassword }).then(() => undefined),
}
