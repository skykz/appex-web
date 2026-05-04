import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Builds a single-line message from a PostgREST / Supabase error for API responses and logs.
 */
export function formatPostgrestError(err: PostgrestError): string {
  const parts = [err.message]
  if (err.details) parts.push(`Details: ${err.details}`)
  if (err.hint) parts.push(`Hint: ${err.hint}`)
  if (err.code) parts.push(`Code: ${err.code}`)
  return parts.join(' | ')
}

/**
 * Appends operator-facing hints for common misconfigurations (RLS, missing migrations).
 */
export function augmentPostgrestFailure(err: PostgrestError): string {
  const base = formatPostgrestError(err)
  const blob = `${err.message} ${err.details ?? ''}`.toLowerCase()
  if (blob.includes('row-level security') || blob.includes('violates row-level security')) {
    return `${base} — Admin writes need the service_role key: set SUPABASE_SERVICE_ROLE_KEY to the service_role secret from Supabase (not the anon key).`
  }
  if (blob.includes('does not exist') || blob.includes('schema cache') || blob.includes('could not find the table')) {
    return `${base} — Run SQL migrations in appex-web/backend/supabase/migrations against this project (at least 002, then 003).`
  }
  return base
}
