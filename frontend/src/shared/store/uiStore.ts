import { create } from 'zustand'

interface UiState {
  isDrawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  toggleDrawer: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  isDrawerOpen: false,
  setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),
  toggleDrawer: () => set({ isDrawerOpen: !get().isDrawerOpen }),
}))
