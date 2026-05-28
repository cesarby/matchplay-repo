import { httpClient } from '@/shared/api/httpClient'

import type { UpdateProfilePayload, UserProfile } from '../types/profile.types'

export const profileApi = {
  get: (): Promise<UserProfile> => httpClient.get<UserProfile>('/me/profile').then((r) => r.data),

  update: (payload: UpdateProfilePayload): Promise<UserProfile> =>
    httpClient.patch<UserProfile>('/me/profile', payload).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    httpClient.post('/me/profile/password', { currentPassword, newPassword }).then(() => undefined),
}
