import { toCsv } from '@shared/lib/csv'
import type { AdminLeadRow, AdminUserRow } from './api'

/**
 * CSV builders for the people directory.
 *
 * Extracted from the page component so they can be tested directly: the export is
 * the one place operators take this data outside the admin, and a shifted column
 * or a dropped field is invisible in the UI.
 */

/** Builds a CSV string from user rows with RFC-style quoted fields where needed. */
export function buildUsersCsv(rows: AdminUserRow[]): string {
  return toCsv(
    ['id', 'email', 'name', 'role', 'created_at', 'credits', 'streak_current'],
    rows,
    (r) => [r.id, r.email, r.name ?? '', r.role, r.created_at, r.credits, r.streak_current]
  )
}

/** Builds a CSV string from lead rows. */
export function buildLeadsCsv(rows: AdminLeadRow[]): string {
  return toCsv(
    [
      'id',
      'email',
      'name',
      'landing',
      'selected_plan',
      'utm_source',
      'utm_campaign',
      'utm_medium',
      'confirmed_at',
      'confirm_email_sent_at',
      'welcome_email_sent_at',
      'created_at',
    ],
    rows,
    (r) => [
      r.id,
      r.email,
      r.name ?? '',
      r.landing ?? '',
      r.selected_plan ?? '',
      r.utm_source ?? '',
      r.utm_campaign ?? '',
      r.utm_medium ?? '',
      r.confirmed_at ?? '',
      r.confirm_email_sent_at ?? '',
      r.welcome_email_sent_at ?? '',
      r.created_at,
    ]
  )
}
