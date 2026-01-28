import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '../api/user-api'
import type { CreateUserDto } from '../model/types'

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
 *
 * @example
 * const { data: user, isLoading } = useCurrentUser()
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => userApi.getCurrentUser(),
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
 * Hook to create a new user.
 * Invalidates the users cache on success.
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserDto) => userApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

/**
 * Hook to update the current user's profile.
 * Invalidates the current user cache on success.
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
