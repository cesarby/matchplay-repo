import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'

import { useAuthStore } from '@/features/auth/store/authStore'
import { normalizeApiError } from '@/shared/api/ApiError'

import { profileApi } from '../api/profileApi'
import { useProfileFeedbackStore } from '../store/profileFeedbackStore'
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

/**
 * Mutation con optimistic update completo (patrón TanStack canónico).
 *
 * Flujo:
 * - `onMutate` cancela queries en vuelo, hace snapshot del cache y aplica el
 *   cambio inmediatamente sobre el cache. Esto es lo que el componente ve
 *   antes de que el server responda.
 * - `onError` revierte al snapshot si la mutation falla.
 * - `onSuccess` reemplaza el cache con la respuesta autoritativa del server
 *   y sincroniza el `authStore` (avatar/bio en el header).
 * - `onSettled` invalida la query para garantizar que cualquier divergencia
 *   se resuelve con un re-fetch (defensa en profundidad).
 *
 * El single source of truth es el cache `['profile', 'current']`. Los
 * componentes consumen `useProfileQuery()` directamente, sin state local.
 */
export function useUpdateProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileApi.update(payload),

    onMutate: async (payload) => {
      // Cancelamos refetches en vuelo para que no pisen el optimistic.
      await qc.cancelQueries({ queryKey: profileKeys.current })

      const prev = qc.getQueryData<UserProfile>(profileKeys.current)
      if (!prev) return { prev }

      const next: UserProfile = { ...prev }

      if (payload.avatarCode !== undefined) {
        next.avatarCode = payload.avatarCode
      }
      if (payload.bio !== undefined) {
        next.bio = payload.bio
      }
      if (payload.provinceCode !== undefined && payload.provinceCode !== '') {
        next.provinceCode = payload.provinceCode
      }
      if (payload.cityCode !== undefined && payload.cityCode !== '') {
        next.cityCode = payload.cityCode
      }
      if (payload.areaCode !== undefined && payload.areaCode !== '') {
        next.areaCode = payload.areaCode
      }
      if (payload._favoriteGamesOptimistic !== undefined) {
        next.favoriteGames = payload._favoriteGamesOptimistic
      }

      qc.setQueryData<UserProfile>(profileKeys.current, next)
      return { prev }
    },

    onError: (err, _payload, context) => {
      if (context?.prev) {
        qc.setQueryData<UserProfile>(profileKeys.current, context.prev)
      }
      // Empuja el error al banner visible en /profile. Antes esto era un
      // console.error silencioso — durante semanas un 500 del backend hacía
      // que los favoritos "aparecieran y desaparecieran" sin que el usuario
      // viera el motivo. Ahora cualquier fallo se ve en pantalla.
      const apiError = normalizeApiError(err)
      const message =
        apiError.message ||
        i18next.t('profile.feedback.genericError', {
          defaultValue: 'Algo salió mal, prueba de nuevo.',
        })
      useProfileFeedbackStore.getState().show(message, 'error')
      // eslint-disable-next-line no-console
      console.error('useUpdateProfileMutation failed', apiError, err)
    },

    onSuccess: (profile) => {
      // El server es la verdad final — sobrescribimos el optimistic con la
      // respuesta autoritativa (incluye orden y datos de los games desde BGG).
      qc.setQueryData<UserProfile>(profileKeys.current, profile)

      // El header lee avatar/bio de `useAuthStore` (zustand, no TanStack).
      // Mergeamos los campos en el store directamente.
      const current = useAuthStore.getState().currentUser
      if (current) {
        useAuthStore.getState().setCurrentUser({
          ...current,
          selectedAvatarCode: profile.avatarCode ?? current.selectedAvatarCode,
          bio: profile.bio ?? undefined,
        })
      }
    },

    onSettled: () => {
      // Defensa en profundidad: si hubo divergencia entre optimistic y server,
      // un refetch garantiza coherencia.
      void qc.invalidateQueries({ queryKey: profileKeys.current })
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
