import type { Request } from 'express'
import type { AuthenticatedRequest } from '../types/index.js'
import { supabaseAdmin } from '../db/supabase.js'
import { appLog } from '../lib/logger.js'

/** Logical entity an admin action targets. `target_id` is stored as text since key types differ. */
export type AuditTargetType =
  | 'user'
  | 'skill'
  | 'module'
  | 'lesson'
  | 'category'
  | 'subscription'
  | 'refund'
  | 'contact_message'
  | 'lesson_submission'
  | 'billing_alert'
  /** A pre-signup funnel lead (`landing_quiz_submissions` row). */
  | 'landing_lead'

export interface AuditEntry {
  action: string
  targetType: AuditTargetType
  targetId?: string | number | null
  metadata?: Record<string, unknown>
  /** Set when the action was attempted but failed — rejected attempts are security-relevant. */
  error?: string
}

/**
 * Appends one row to `admin_actions`.
 *
 * Never throws: an audit-write failure must not roll back or block the action the
 * operator actually requested. Failures are surfaced to the server log instead,
 * where they show up as an operational problem rather than a user-facing one.
 */
export async function recordAdminAction(req: Request, entry: AuditEntry): Promise<void> {
  try {
    const { userId } = req as AuthenticatedRequest

    // Resolve the actor's email so the row stays readable if the account is later deleted.
    let actorEmail = 'unknown'
    if (userId) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle()
      if (data?.email) actorEmail = data.email as string
    }

    const { error } = await supabaseAdmin.from('admin_actions').insert({
      actor_id: userId ?? null,
      actor_email: actorEmail,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId != null ? String(entry.targetId) : null,
      metadata: entry.metadata ?? {},
      error: entry.error ?? null,
    })

    if (error) {
      appLog.warn('admin audit write failed', {
        action: entry.action,
        targetType: entry.targetType,
        reason: error.message,
      })
    }
  } catch (err) {
    appLog.warn('admin audit write threw', {
      action: entry.action,
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}
