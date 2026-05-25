import { useMutation, useQueryClient } from '@tanstack/react-query'

import { authApi } from '../api/authApi'
import { authBroadcast } from '../lib/authBroadcast'
import { refreshScheduler } from '../lib/refreshScheduler'
import { useAuthStore } from '../store/authStore'

export function useLogoutMutation() {
  const qc = useQueryClient()
  return useMutation<void, unknown, void>({
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => {
      useAuthStore.getState().clear()
      refreshScheduler.cancel()
      qc.clear()
      authBroadcast.publish('logout')
    },
  })
}
