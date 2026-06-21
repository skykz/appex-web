import { supabaseAdmin } from '../db/supabase.js'
import { AppError } from '../utils/error-handler.js'

export async function getBalance(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single()

  return data?.balance ?? 0
}

export async function deductCredit(userId: string): Promise<number> {
  // Atomic: a single conditional UPDATE (balance = balance - 1 WHERE balance > 0)
  // runs inside the deduct_credit() Postgres function so two concurrent chat
  // requests cannot both read the same balance and double-spend. Returns the new
  // balance, or -1 when there were no credits to deduct.
  const { data, error } = await supabaseAdmin.rpc('deduct_credit', {
    p_user_id: userId,
  })

  if (error) throw new AppError(500, error.message)

  const newBalance = typeof data === 'number' ? data : -1
  if (newBalance < 0) {
    throw new AppError(403, 'Insufficient credits')
  }

  return newBalance
}
