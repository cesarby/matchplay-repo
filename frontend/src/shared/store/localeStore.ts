import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'es' | 'en'

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const defaultLocale: Locale = (import.meta.env.VITE_DEFAULT_LOCALE as Locale) ?? 'es'

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: defaultLocale,
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'matchplay.locale' },
  ),
)
