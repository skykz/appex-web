import { supabaseAdmin } from '../db/supabase.js'
import { AppError } from './error-handler.js'

type FilterableQuery = {
  not: (column: string, operator: string, value: string) => FilterableQuery
}

/**
 * Loads UUIDs for users with role `admin` so insight queries can exclude internal accounts.
 */
export async function getAdminUserIds(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('role', 'admin')
  if (error) throw new AppError(500, `admin user ids: ${error.message}`)
  return (data ?? []).map((row) => row.id as string)
}

/**
 * Builds a PostgREST `in` list for `.not(column, 'in', value)`; returns null when empty.
 */
export function adminExclusionInList(adminIds: string[]): string | null {
  if (adminIds.length === 0) return null
  return `(${adminIds.join(',')})`
}

/**
 * Adds `.not(userIdColumn, 'in', …)` when admin accounts exist; otherwise returns the query unchanged.
 */
export function excludeAdminUsers<T extends FilterableQuery>(
  query: T,
  adminIds: string[],
  userIdColumn = 'user_id'
): T {
  const list = adminExclusionInList(adminIds)
  if (!list) return query
  return query.not(userIdColumn, 'in', list) as T
}
