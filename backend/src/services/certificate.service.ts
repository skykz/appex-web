import { supabaseAdmin } from '../db/supabase.js'

/** Branded credential prefix. Codes look like APX-2026-000142. */
const CERT_PREFIX = 'APX'

export type Certificate = {
  cert_code: string
  user_name: string
  skill_id: number
  course_title: string
  issued_at: string
}

/**
 * Formats a sequence value into a branded, sequential credential code:
 *   APX-<year>-<6-digit zero-padded sequence>   e.g. APX-2026-000142
 */
function formatCertCode(seq: number, year: number): string {
  return `${CERT_PREFIX}-${year}-${String(seq).padStart(6, '0')}`
}

/**
 * Mints a course-completion certificate for (user, skill). Idempotent: if the
 * learner already holds a certificate for this course, the existing one is
 * returned unchanged. Intended to be called the moment a course flips to
 * `completed` (see recalculateSkillProgress).
 *
 * The credential code is branded + sequential. The sequence number comes from a
 * Postgres sequence (`certificate_seq`) so concurrent completions never collide;
 * the row's UNIQUE(user_id, skill_id) is the idempotency guard.
 *
 * Failures are swallowed by the caller's try/catch on purpose — a certificate is
 * a reward, not a gate, so issuance must never break lesson completion.
 */
export async function mintCertificate(
  userId: string,
  skillId: number
): Promise<Certificate | null> {
  // Already issued? Return it (idempotent).
  const { data: existing } = await supabaseAdmin
    .from('certificates')
    .select('cert_code, user_name, skill_id, course_title, issued_at')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle()
  if (existing) return existing as Certificate

  // Snapshot the learner name + course title at issuance time so a later
  // rename never mutates an already-issued credential.
  const [{ data: user }, { data: skill }] = await Promise.all([
    supabaseAdmin.from('users').select('name').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('skills').select('title').eq('id', skillId).maybeSingle(),
  ])
  if (!user || !skill) return null

  // Reserve the next sequence value atomically. PostgREST may serialize a
  // numeric scalar as either a JS number or a numeric string, so coerce both.
  const { data: seqRow, error: seqError } = await supabaseAdmin.rpc('next_certificate_seq')
  const seq = Number(seqRow)
  if (seqError || !Number.isFinite(seq) || seq <= 0) return null

  const issuedAt = new Date()
  const certCode = formatCertCode(seq, issuedAt.getUTCFullYear())

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('certificates')
    .insert({
      cert_code: certCode,
      user_id: userId,
      user_name: user.name,
      skill_id: skillId,
      course_title: skill.title,
      issued_at: issuedAt.toISOString(),
    })
    .select('cert_code, user_name, skill_id, course_title, issued_at')
    .single()

  // A concurrent mint may have won the UNIQUE(user_id, skill_id) race — fall
  // back to reading whatever row now exists.
  if (insertError) {
    const { data: row } = await supabaseAdmin
      .from('certificates')
      .select('cert_code, user_name, skill_id, course_title, issued_at')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle()
    return (row as Certificate) ?? null
  }

  return inserted as Certificate
}

/**
 * Looks up a learner's certificate for a course, if issued. Used by the skill
 * detail endpoint to surface the credential alongside course progress.
 */
export async function getCertificate(
  userId: string,
  skillId: number
): Promise<Certificate | null> {
  const { data } = await supabaseAdmin
    .from('certificates')
    .select('cert_code, user_name, skill_id, course_title, issued_at')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle()
  return (data as Certificate) ?? null
}

/**
 * Public verification: resolves a credential code to its (sanitized) details.
 * Returns null for unknown codes. No auth — this powers /verify/:code.
 */
export async function verifyCertificate(certCode: string): Promise<Certificate | null> {
  const { data } = await supabaseAdmin
    .from('certificates')
    .select('cert_code, user_name, skill_id, course_title, issued_at')
    .eq('cert_code', certCode)
    .maybeSingle()
  return (data as Certificate) ?? null
}
