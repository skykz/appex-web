/**
 * Test environment bootstrap.
 *
 * `src/config/env.ts` validates process.env at import time and throws when the
 * Supabase keys are absent. Anything that transitively imports it — including the
 * email templates, which only need the theme constants — would therefore fail to
 * load in a test run.
 *
 * These are deliberately obvious placeholders: unit tests here exercise pure
 * rendering and helper logic, so nothing should ever dial out with them. If a test
 * starts making real calls, these values make it obvious in the failure.
 */

process.env.NODE_ENV ??= 'test'
process.env.SUPABASE_URL ??= 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
process.env.JWT_SECRET ??= 'test-jwt-secret-value-not-used-anywhere'

// Support address the templates print in footers; asserted on in the tests.
process.env.MAILGUN_REPLY_TO ??= 'hello@appexme.com'
