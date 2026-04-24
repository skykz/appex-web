/**
 * Promote an existing user account to admin role.
 *
 * Usage:
 *   npx tsx backend/scripts/make-admin.ts admin@example.com
 *
 * Requirements:
 *   - The account must already exist (sign up via the regular user app first).
 *   - Migration 002_admin_and_categories.sql must be applied.
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
if (!email) {
  console.error('Usage: tsx backend/scripts/make-admin.ts <email>')
  process.exit(1)
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

const supabase = createClient(url, key)

const { data, error } = await supabase
  .from('users')
  .update({ role: 'admin' })
  .eq('email', email)
  .select('id, email, name, role')
  .maybeSingle()

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
if (!data) {
  console.error(`No user found with email "${email}". Sign up first at /auth, then run this again.`)
  process.exit(1)
}

console.log('Admin granted:', data)
