import Stripe from 'stripe'
import { env } from '../config/env.js'
import { AppError } from '../utils/error-handler.js'

let cached: Stripe | null = null

/**
 * Lazily-constructed Stripe client. Throws a 503 AppError if Stripe is not configured,
 * so subscription endpoints fail gracefully when keys are missing rather than crashing on import.
 */
export function getStripe(): Stripe {
  if (!env.stripeEnabled || !env.STRIPE_SECRET_KEY) {
    throw new AppError(503, 'Stripe is not configured on the server')
  }
  if (!cached) {
    cached = new Stripe(env.STRIPE_SECRET_KEY, {
      // Pin to a known API version so silent upstream changes can't break us.
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
      appInfo: { name: 'AppEx', url: 'https://app.appexme.com' },
    })
  }
  return cached
}
