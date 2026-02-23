import { create } from 'zustand'

/**
 * UI state store for global UI concerns like modals, sidebars, etc.
 * Uses Zustand for lightweight state management.
 *
 * @example
 * const { isSidebarOpen, toggleSidebar } = useUiStore()
 */
interface UiState {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}))
