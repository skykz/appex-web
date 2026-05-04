import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'

const MAX_ATTEMPTS_FETCH = 8000
const MAX_OPEN_RESPONSES = 120
const NULL_USER = '00000000-0000-0000-0000-000000000000'

/**
 * Parses a numeric lesson id from route params.
 */
function lessonIdParam(value: string | undefined): number {
  const n = Number(value)
  if (!Number.isFinite(n)) throw new AppError(400, 'Invalid lesson id')
  return n
}

type AttemptRow = {
  step_index: number
  block_index: number
  is_correct: boolean
  open_response: string | null
  created_at: string
  user_id: string
}

/**
 * Returns per-block quiz stats, open-ended responses, and submission counts for authoring insights.
 */
export async function getLessonEngagement(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rawId = req.params.id
    const lessonId = lessonIdParam(Array.isArray(rawId) ? rawId[0] : rawId)

    const { data: lesson, error: le } = await supabaseAdmin
      .from('lessons')
      .select('id, label, title')
      .eq('id', lessonId)
      .maybeSingle()
    if (le) throw new AppError(500, le.message)
    if (!lesson) throw new AppError(404, 'Lesson not found')

    const { count: attemptCount, error: ce } = await supabaseAdmin
      .from('lesson_quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_id', lessonId)
    if (ce) throw new AppError(500, ce.message)

    const total = attemptCount ?? 0
    const statsApproximate = total > MAX_ATTEMPTS_FETCH

    const { data: attemptsRaw, error: ae } = await supabaseAdmin
      .from('lesson_quiz_attempts')
      .select(
        'step_index, block_index, is_correct, open_response, created_at, user_id'
      )
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(MAX_ATTEMPTS_FETCH)

    if (ae) throw new AppError(500, ae.message)

    const attempts = (attemptsRaw ?? []) as AttemptRow[]

    type BlockAgg = { attempts: number; correct: number }
    const blockStats = new Map<string, BlockAgg>()

    for (const row of attempts) {
      const key = `${row.step_index}:${row.block_index}`
      const cur = blockStats.get(key) ?? { attempts: 0, correct: 0 }
      cur.attempts += 1
      if (row.is_correct) cur.correct += 1
      blockStats.set(key, cur)
    }

    const quizByBlock = [...blockStats.entries()]
      .map(([key, v]) => {
        const [si, bi] = key.split(':').map((x) => Number(x))
        const wrong = v.attempts - v.correct
        const wrongRate = v.attempts > 0 ? wrong / v.attempts : 0
        return {
          stepIndex: si,
          blockIndex: bi,
          attempts: v.attempts,
          correct: v.correct,
          wrong,
          wrongRate,
        }
      })
      .sort((a, b) => a.stepIndex - b.stepIndex || a.blockIndex - b.blockIndex)

    const openRows = attempts
      .filter((r) => r.open_response != null && String(r.open_response).trim().length > 0)
      .slice(0, MAX_OPEN_RESPONSES)

    const openUserIds = [...new Set(openRows.map((r) => r.user_id))]
    const { data: users, error: ue } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('id', openUserIds.length ? openUserIds : [NULL_USER])
    if (ue) throw new AppError(500, ue.message)
    const userMap = new Map((users ?? []).map((u) => [u.id as string, u]))

    const openResponses = openRows.map((r) => {
      const u = userMap.get(r.user_id)
      return {
        stepIndex: r.step_index,
        blockIndex: r.block_index,
        userEmail: u?.email ?? '—',
        userName: (u?.name as string | null) ?? null,
        text: String(r.open_response).trim(),
        createdAt: r.created_at,
      }
    })

    const { count: submissionTotal, error: se } = await supabaseAdmin
      .from('lesson_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_id', lessonId)
    if (se) throw new AppError(500, se.message)

    const { data: subRows, error: sre } = await supabaseAdmin
      .from('lesson_submissions')
      .select(
        'id, message, attachment_url, status, created_at, user_id, users(email, name)'
      )
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(10)
    if (sre) throw new AppError(500, sre.message)

    const recentSubmissions = (subRows ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      message: r.message as string | null,
      attachmentUrl: r.attachment_url as string | null,
      status: r.status as string,
      createdAt: r.created_at as string,
      userEmail: (r.users as { email?: string } | null)?.email ?? '—',
      userName: (r.users as { name?: string } | null)?.name ?? null,
    }))

    res.json({
      lesson: {
        id: lesson.id as number,
        label: lesson.label as string,
        title: lesson.title as string,
      },
      summary: {
        totalQuizAttempts: total,
        statsApproximate,
        statsSampleSize: attempts.length,
        uniqueQuizBlocks: quizByBlock.length,
      },
      quizByBlock,
      openResponses,
      submissions: {
        total: submissionTotal ?? 0,
        recent: recentSubmissions,
      },
    })
  } catch (err) {
    next(err)
  }
}
