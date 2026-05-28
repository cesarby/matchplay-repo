import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/store/authStore'

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
      // FU1: el header lee avatar/bio de useAuthStore (zustand, no TanStack).
      // El invalidate de query no sirve — hay que mergear los campos en el
      // store directamente para que el header se re-renderice.
      const current = useAuthStore.getState().currentUser
      if (current) {
        useAuthStore.getState().setCurrentUser({
          ...current,
          selectedAvatarCode: profile.avatarCode ?? current.selectedAvatarCode,
          bio: profile.bio ?? undefined,
        })
      }
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
