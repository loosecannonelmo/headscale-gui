import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'system'
export type TableDensity = 'comfortable' | 'dense'
export type UsersView = 'grid' | 'table'

interface UIStore {
  sidebarCollapsed: boolean
  theme: Theme
  tableDensity: TableDensity
  dateFormat: 'relative' | 'absolute' | 'both'
  usersView: UsersView

  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
  setTableDensity: (density: TableDensity) => void
  setDateFormat: (format: 'relative' | 'absolute' | 'both') => void
  setUsersView: (view: UsersView) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'system',
      tableDensity: 'comfortable',
      dateFormat: 'relative',
      usersView: 'grid',

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      setTableDensity: (density) => set({ tableDensity: density }),
      setDateFormat: (format) => set({ dateFormat: format }),
      setUsersView: (view) => set({ usersView: view }),
    }),
    { name: 'headscale-ui' },
  ),
)
