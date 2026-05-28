import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { profileApi } from '../api/profileApi'
import type { UpdateProfilePayload, UserProfile } from '../types/profile.types'

export const profileKeys = {
  current: ['profile', 'current'] as const,
}

export function useProfileQuery() {
  return useQuery<UserProfile>({
    queryKey: profileKeys.current,
    queryFn: () => profileApi.get(),
    staleTime: 30_000,
  })
}

export function useUpdateProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileApi.update(payload),
    onSuccess: (profile) => {
      qc.setQueryData<UserProfile>(profileKeys.current, profile)
      // Auth current user vive en Zustand (no TanStack), pero invalidamos
      // por si alguna parte de la app cachea bajo ['auth','current'].
      void qc.invalidateQueries({ queryKey: ['auth', 'current'] })
    },
  })
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string
      newPassword: string
    }) => profileApi.changePassword(currentPassword, newPassword),
  })
}
