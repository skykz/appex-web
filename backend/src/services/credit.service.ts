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
  const balance = await getBalance(userId)

  if (balance <= 0) {
    throw new AppError(403, 'Insufficient credits')
  }

  const newBalance = balance - 1

  await supabaseAdmin
    .from('user_credits')
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return newBalance
}
