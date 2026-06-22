import { supabaseAdmin } from '../db/supabase.js'

/** Branded credential prefix. Codes look like APX-2026-000142. */
const CERT_PREFIX = 'APX'

const CERT_COLUMNS =
  'cert_code, user_name, skill_id, course_title, cert_description, cert_tags, issued_at'

export type Certificate = {
  cert_code: string
  user_name: string
  skill_id: number
  /** Certificate display title snapshotted at issuance. */
  course_title: string
  /** Description body snapshotted at issuance. */
  cert_description: string
  /** Skill tags snapshotted at issuance. */
  cert_tags: string[]
  issued_at: string
}

type SkillCertConfig = {
  title: string
  cert_title: string | null
  cert_description: string | null
  cert_tags: string[] | null
}

/**
 * Normalizes a Postgres jsonb tags column into a string array.
 */
function normalizeCertTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/**
 * Maps a certificate row from Supabase into the public Certificate shape.
 */
function mapCertificateRow(row: Record<string, unknown>): Certificate {
  return {
    cert_code: String(row.cert_code),
    user_name: String(row.user_name),
    skill_id: Number(row.skill_id),
    course_title: String(row.course_title),
    cert_description: String(row.cert_description ?? ''),
    cert_tags: normalizeCertTags(row.cert_tags),
    issued_at: String(row.issued_at),
  }
}

/**
 * Resolves admin-defined certificate content for a skill at mint time.
 */
function resolveCertContent(skill: SkillCertConfig): {
  course_title: string
  cert_description: string
  cert_tags: string[]
} {
  const course_title = skill.cert_title?.trim() || skill.title
  const cert_description = skill.cert_description?.trim() || ''
  const cert_tags = normalizeCertTags(skill.cert_tags)
  return { course_title, cert_description, cert_tags }
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
 * Course certificate text (title, description, tags) is snapshotted from the
 * skill's admin-defined config so later edits never mutate issued credentials.
 */
export async function mintCertificate(
  userId: string,
  skillId: number
): Promise<Certificate | null> {
  const { data: existing } = await supabaseAdmin
    .from('certificates')
    .select(CERT_COLUMNS)
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle()
  if (existing) return mapCertificateRow(existing)

  const [{ data: user }, { data: skill }] = await Promise.all([
    supabaseAdmin.from('users').select('name').eq('id', userId).maybeSingle(),
    supabaseAdmin
      .from('skills')
      .select('title, cert_title, cert_description, cert_tags')
      .eq('id', skillId)
      .maybeSingle(),
  ])
  if (!user || !skill) return null

  const certContent = resolveCertContent(skill as SkillCertConfig)

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
      course_title: certContent.course_title,
      cert_description: certContent.cert_description,
      cert_tags: certContent.cert_tags,
      issued_at: issuedAt.toISOString(),
    })
    .select(CERT_COLUMNS)
    .single()

  if (insertError) {
    const { data: row } = await supabaseAdmin
      .from('certificates')
      .select(CERT_COLUMNS)
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle()
    return row ? mapCertificateRow(row) : null
  }

  return mapCertificateRow(inserted)
}

/**
 * Looks up a learner's certificate for a course, if issued.
 */
export async function getCertificate(
  userId: string,
  skillId: number
): Promise<Certificate | null> {
  const { data } = await supabaseAdmin
    .from('certificates')
    .select(CERT_COLUMNS)
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle()
  return data ? mapCertificateRow(data) : null
}

/**
 * Public verification: resolves a credential code to its (sanitized) details.
 */
export async function verifyCertificate(certCode: string): Promise<Certificate | null> {
  const { data } = await supabaseAdmin
    .from('certificates')
    .select(CERT_COLUMNS)
    .eq('cert_code', certCode)
    .maybeSingle()
  return data ? mapCertificateRow(data) : null
}
