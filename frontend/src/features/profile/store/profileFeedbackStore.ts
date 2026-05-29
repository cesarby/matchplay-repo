import { create } from 'zustand'

export type FeedbackVariant = 'error' | 'success'

interface ProfileFeedbackState {
  message: string | null
  variant: FeedbackVariant | null
  /** Epoch ms — sirve para que el banner pueda decidir auto-dismiss. */
  shownAt: number | null
  show: (message: string, variant: FeedbackVariant) => void
  clear: () => void
}

/**
 * Store mínimo de feedback global para la página /profile. Cualquier mutation
 * del perfil (avatar, bio, favoritos, ubicación, contraseña) pushea aquí su
 * éxito/error. El {@code ProfileFeedbackBanner} en {@code ProfilePage} lo
 * consume y muestra una banda arriba.
 *
 * Por qué un store separado y no `useMutationState` de TanStack: las mutations
 * viven en cada componente; necesitábamos algo que ProfilePage pudiera leer
 * sin acoplarse a todas las mutations individuales. Zustand resuelve esto con
 * 8 líneas.
 */
export const useProfileFeedbackStore = create<ProfileFeedbackState>((set) => ({
  message: null,
  variant: null,
  shownAt: null,
  show: (message, variant) => set({ message, variant, shownAt: Date.now() }),
  clear: () => set({ message: null, variant: null, shownAt: null }),
}))
