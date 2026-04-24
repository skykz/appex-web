import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ADMIN_TOKEN_KEY } from '@shared/api/http-client'
import type { AdminUser } from './types'

const REFRESH_KEY = 'appex_admin_refresh_token'

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
        localStorage.setItem(REFRESH_KEY, refreshToken)
        set({ user, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(REFRESH_KEY)
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'appex_admin_auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
)
