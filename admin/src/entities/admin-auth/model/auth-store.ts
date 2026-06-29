import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ADMIN_REFRESH_TOKEN_KEY, ADMIN_TOKEN_KEY } from '@shared/api/http-client'
import type { AdminUser } from './types'

interface AdminAuthState {
  user: AdminUser | null
  isAuthenticated: boolean
  setAuth: (data: { user: AdminUser; accessToken: string; refreshToken: string }) => void
  logout: () => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: ({ user, accessToken, refreshToken }) => {
        localStorage.setItem(ADMIN_TOKEN_KEY, accessToken)
        localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken)
        set({ user, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY)
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'appex_admin_auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
)
