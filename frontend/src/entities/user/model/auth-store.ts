import { create } from 'zustand'
import type { User } from './types'

const TOKEN_KEY = 'appex_access_token'
const REFRESH_TOKEN_KEY = 'appex_refresh_token'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string, refreshToken: string) => void
  setUser: (user: User) => void
  logout: () => void
  getToken: () => string | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    set({ user, token, isAuthenticated: true })
  },

  setUser: (user) => {
    set({ user })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    set({ user: null, token: null, isAuthenticated: false })
  },

  getToken: () => get().token,
}))
