import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../../types/index.js'
import { supabaseAdmin } from '../../db/supabase.js'
import { AppError } from '../../utils/error-handler.js'
import { verifyCertificate } from '../../services/certificate.service.js'

/**
 * Lists every certificate the current learner has earned (newest first).
 */
export async function listMyCertificates(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthenticatedRequest
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('cert_code, user_name, skill_id, course_title, cert_description, cert_tags, issued_at')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false })
    if (error) throw new AppError(500, error.message)
    res.json({ items: data ?? [] })
  } catch (err) {
    next(err)
  }
}

/**
 * Public credential verification — resolves a code (APX-2026-000142) to its
 * holder + course. No auth: this powers the shareable /verify/:code page.
 */
export async function verifyCertificateByCode(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const code = String(req.params.code ?? '').trim()
    if (!code) throw new AppError(400, 'Missing certificate code')

    const cert = await verifyCertificate(code)
    if (!cert) {
      res.json({ valid: false })
      return
    }

    res.json({
      valid: true,
      certificate: {
        cert_code: cert.cert_code,
        user_name: cert.user_name,
        course_title: cert.course_title,
        cert_description: cert.cert_description,
        cert_tags: cert.cert_tags,
        issued_at: cert.issued_at,
      },
    })
  } catch (err) {
    next(err)
  }
}
