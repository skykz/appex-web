import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { userApi } from '../api/user-api'
import { useAuthStore } from '../model/auth-store'
import type { CreateUserDto, LoginDto } from '../model/types'

/**
 * Query keys for user-related queries.
 * Centralized to ensure consistent cache invalidation.
 */
export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  byId: (id: string) => [...userKeys.all, id] as const,
}

/**
 * Hook to fetch the current authenticated user.
 */
export function useCurrentUser() {
  const { isAuthenticated, setUser, logout } = useAuthStore()

  return useQuery({
    queryKey: userKeys.me(),
    queryFn: async () => {
      const user = await userApi.getCurrentUser()
      setUser(user)
      return user
    },
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error && (error as any).status === 401) {
        logout()
        return false
      }
      return failureCount < 2
    },
  })
}

/**
 * Hook to fetch a user by ID.
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.byId(id),
    queryFn: () => userApi.getUserById(id),
    enabled: !!id,
  })
}

/**
 * Hook to log in a user.
 */
export function useLogin() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: LoginDto) => userApi.login(data),
    onSuccess: (response) => {
      setAuth(response.user, response.accessToken, response.refreshToken)
      navigate('/home', { replace: true })
    },
  })
}

/**
 * Hook to create a new user account.
 */
export function useCreateUser() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: CreateUserDto) => userApi.createUser(data),
    onSuccess: (response) => {
      setAuth(response.user, response.accessToken, response.refreshToken)
      navigate('/home', { replace: true })
    },
  })
}

/**
 * Hook to update the current user's profile.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string }) => userApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() })
    },
  })
}

/**
 * Hook to log out the current user.
 */
export function useLogout() {
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return () => {
    logout()
    queryClient.clear()
    navigate('/auth', { replace: true })
  }
}
