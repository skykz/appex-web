#!/usr/bin/env node
/**
 * Clone the live Stripe pricing setup into test mode.
 *
 * Test mode is a separate object space: live price/coupon ids do not resolve
 * there. A test secret key with live price ids fails loudly ("No such price"),
 * but a test key with live COUPON ids fails silently — couponIdForTier() finds
 * nothing, checkout.coupon_missing is logged, and the customer is sent through
 * at full price. So every object this backend references has to exist in test
 * mode before the key is swapped.
 *
 * Rather than re-typing amounts from STRIPE-LIVE-SETUP.md (whose table has
 * drifted from the real .env — it lists neither the 12-week nor the 1-day
 * plan), this reads each object from the live account and recreates it in test
 * mode. Coupons are recreated under their LIVE IDS, so the only lines that
 * differ between the live and test .env are the key, the webhook secret, and
 * the price ids.
 *
 * The clone is structural, not just numeric: live keeps a SEPARATE product per
 * plan ("One week", "Appex Premium", "Appex 12 Weeks", "One year of premium"),
 * and each is recreated as its own test product with the same name, images and
 * price nickname. Those strings are what the customer reads on the Stripe
 * Checkout page and on the invoice, so collapsing them into one product would
 * make test checkouts look different from production.
 *
 * Idempotent: an object that already exists in test mode is reported and left
 * alone. Read-only against live — it never writes with the live key.
 *
 * Usage:
 *   STRIPE_LIVE_KEY=sk_live_... STRIPE_TEST_KEY=sk_test_... \
 *     node scripts/clone-stripe-to-test.mjs [--apply] [--reset]
 *
 * Without --apply it only reports what it would do.
 * --reset archives previously cloned test prices/products first, so a changed
 * live setup can be re-cloned cleanly instead of layering a second copy.
 */
import Stripe from 'stripe'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const APPLY = process.argv.includes('--apply')
/**
 * Deactivate previously cloned test prices/products before recreating them.
 * Stripe does not allow deleting a price that a subscription has used, so
 * "reset" means archive (active:false) — the objects stay for history but stop
 * appearing in the dashboard's active list.
 */
const RESET = process.argv.includes('--reset')
const here = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = resolve(here, '../.env')
/**
 * Live ids are read from the backup once .env has been switched to test mode.
 * Without this, a second run reads the TEST price ids out of .env and tries to
 * retrieve them with the live key ("No such price … a similar object exists in
 * test mode").
 */
const LIVE_ENV_PATH = resolve(here, '../.env.live.bak')

/** Minimal .env reader — avoids mutating process.env with the live key. */
function readEnvFile(path) {
  const out = {}
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return out
  }
  for (const line of raw.split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!m) continue
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const envFromDotEnv = readEnvFile(ENV_PATH)
const envFromBackup = readEnvFile(LIVE_ENV_PATH)

// Prefer whichever file actually holds a live key: that is the one whose price
// and coupon ids are live-mode ids.
const liveSource = envFromDotEnv.STRIPE_SECRET_KEY?.startsWith('sk_live_')
  ? { env: envFromDotEnv, label: '.env' }
  : envFromBackup.STRIPE_SECRET_KEY?.startsWith('sk_live_')
    ? { env: envFromBackup, label: '.env.live.bak' }
    : { env: envFromDotEnv, label: '.env' }

const fileEnv = liveSource.env

const LIVE_KEY = process.env.STRIPE_LIVE_KEY || fileEnv.STRIPE_SECRET_KEY
const TEST_KEY = process.env.STRIPE_TEST_KEY

function die(msg) {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

if (!LIVE_KEY) die('No live key. Set STRIPE_LIVE_KEY or keep sk_live_… in backend/.env.')
if (!LIVE_KEY.startsWith('sk_live_')) die(`Live key must start with sk_live_ (got ${LIVE_KEY.slice(0, 8)}…).`)
if (!TEST_KEY) die('Set STRIPE_TEST_KEY=sk_test_… (Dashboard → test mode → Developers → API keys).')
if (!TEST_KEY.startsWith('sk_test_')) die(`Test key must start with sk_test_ (got ${TEST_KEY.slice(0, 8)}…).`)

const live = new Stripe(LIVE_KEY)
const test = new Stripe(TEST_KEY)

/** env var -> live id, for every price this backend resolves. */
const PRICE_VARS = [
  'STRIPE_PRICE_1WEEK',
  'STRIPE_PRICE_1WEEK_INTRO',
  'STRIPE_PRICE_4WEEK',
  'STRIPE_PRICE_12WEEK',
  'STRIPE_PRICE_YEARLY',
]

const COUPON_VARS = [
  'STRIPE_INTRO_COUPON_1DAY',
  'STRIPE_INTRO_COUPON_1WEEK',
  'STRIPE_INTRO_COUPON_4WEEK',
  'STRIPE_INTRO_COUPON_12WEEK',
  'STRIPE_INTRO_COUPON_YEAR',
  'STRIPE_INTRO_COUPON_ID',
  'STRIPE_EXIT_COUPON_1DAY',
  'STRIPE_EXIT_COUPON_1WEEK',
  'STRIPE_EXIT_COUPON_4WEEK',
  'STRIPE_EXIT_COUPON_12WEEK',
  'STRIPE_EXIT_COUPON_YEAR',
]

const money = (amount, currency) =>
  amount == null ? 'n/a' : `${(amount / 100).toFixed(2)} ${String(currency).toUpperCase()}`

const recurringLabel = (r) =>
  r ? `every ${r.interval_count ?? 1} ${r.interval}${(r.interval_count ?? 1) > 1 ? 's' : ''}` : 'one-time'

async function main() {
  console.log(`\nMode: ${APPLY ? 'APPLY — will create objects in test mode' : 'DRY RUN — nothing will be created'}`)
  console.log(`Live ids read from: ${liveSource.label}`)

  const [liveAcct, testAcct] = await Promise.all([live.accounts.retrieve(), test.accounts.retrieve()])
  console.log(`Live account: ${liveAcct.id}`)
  console.log(`Test account: ${testAcct.id}`)
  if (liveAcct.id !== testAcct.id) {
    die(
      `These keys belong to DIFFERENT Stripe accounts (${liveAcct.id} vs ${testAcct.id}).\n` +
        `  The test key must be the test-mode key of the SAME account, or you will be\n` +
        `  cloning your pricing into someone else's account.`
    )
  }

  // ---- Prices ---------------------------------------------------------------
  // Distinct ids only: 1WEEK and 1WEEK_INTRO point at the same live price, and
  // cloning it twice would create two unrelated test prices.
  const uniqueLivePriceIds = [...new Set(PRICE_VARS.map((v) => fileEnv[v]).filter(Boolean))]
  const priceMap = new Map() // live price id -> test price id

  if (RESET) {
    console.log(`\n── Reset: archiving previously cloned test objects ──`)
    for (const livePriceId of uniqueLivePriceIds) {
      const found = await test.prices.search({
        query: `metadata['cloned_from']:'${livePriceId}'`,
        limit: 10,
      })
      for (const old of found.data) {
        if (!old.active) continue
        if (!APPLY) {
          console.log(`  ~ would archive test price ${old.id}`)
          continue
        }
        // Unlink the marker so a later run does not pick this price back up.
        await test.prices.update(old.id, {
          active: false,
          metadata: { cloned_from: '', archived_by: 'clone-stripe-to-test' },
        })
        console.log(`  ~ archived test price ${old.id}`)
      }
    }
    const oldProducts = await test.products.search({
      query: `metadata['cloned_for']:'appex-test'`,
      limit: 20,
    })
    for (const op of oldProducts.data) {
      if (!op.active) continue
      if (!APPLY) {
        console.log(`  ~ would archive test product ${op.id} (${op.name})`)
        continue
      }
      await test.products.update(op.id, {
        active: false,
        metadata: { cloned_for: '', archived_by: 'clone-stripe-to-test' },
      })
      console.log(`  ~ archived test product ${op.id} (${op.name})`)
    }
  }

  console.log(`\n── Prices (${uniqueLivePriceIds.length} distinct) ──`)

  for (const livePriceId of uniqueLivePriceIds) {
    const p = await live.prices.retrieve(livePriceId, { expand: ['product'] })
    const label = `${money(p.unit_amount, p.currency)} ${recurringLabel(p.recurring)}`
    const liveProduct = typeof p.product === 'object' ? p.product : null
    const productName = liveProduct?.name ?? 'Appex Premium'

    // A previous run tags its output, so a re-run reuses it instead of duplicating.
    const existing = await test.prices.search({
      query: `metadata['cloned_from']:'${livePriceId}'`,
      limit: 1,
    })
    // Under --reset the existing clone is being replaced, so it is not reused.
    // (In a dry run nothing was actually archived, hence the explicit check.)
    if (!RESET && existing.data.length && existing.data[0].active) {
      priceMap.set(livePriceId, existing.data[0].id)
      console.log(`  = ${livePriceId}  ${label}  "${productName}"\n      exists in test: ${existing.data[0].id}`)
      continue
    }

    if (!APPLY) {
      priceMap.set(livePriceId, '<created on --apply>')
      console.log(
        `  + ${livePriceId}  ${label}\n` +
          `      would create product "${productName}"` +
          `${liveProduct?.images?.length ? ` (+${liveProduct.images.length} image)` : ''}` +
          `${p.nickname ? ` · price nickname "${p.nickname}"` : ''}`
      )
      continue
    }

    // One test product PER live product, keyed by the live product id — this is
    // what makes the test Checkout page read the same as production. Reusing a
    // single product for every price would relabel the annual plan "One week".
    const marker = liveProduct?.id ?? `price:${livePriceId}`
    const found = await test.products.search({
      query: `metadata['cloned_from_product']:'${marker}'`,
      limit: 1,
    })

    let productId
    if (found.data.length && found.data[0].active) {
      productId = found.data[0].id
      console.log(`      reusing test product ${productId} ("${found.data[0].name}")`)
    } else {
      const created = await test.products.create({
        name: productName,
        ...(liveProduct?.description ? { description: liveProduct.description } : {}),
        // Live image URLs are files.stripe.com links scoped to the live account;
        // test mode can still fetch them, so the Checkout page keeps its artwork.
        ...(liveProduct?.images?.length ? { images: liveProduct.images } : {}),
        ...(liveProduct?.unit_label ? { unit_label: liveProduct.unit_label } : {}),
        ...(liveProduct?.statement_descriptor
          ? { statement_descriptor: liveProduct.statement_descriptor }
          : {}),
        ...(liveProduct?.marketing_features?.length
          ? { marketing_features: liveProduct.marketing_features }
          : {}),
        metadata: {
          ...(liveProduct?.metadata ?? {}),
          cloned_for: 'appex-test',
          cloned_from_product: marker,
        },
      })
      productId = created.id
      console.log(`      created test product ${productId} ("${productName}")`)
    }

    const createdPrice = await test.prices.create({
      product: productId,
      currency: p.currency,
      unit_amount: p.unit_amount,
      ...(p.nickname ? { nickname: p.nickname } : {}),
      ...(p.tax_behavior && p.tax_behavior !== 'unspecified'
        ? { tax_behavior: p.tax_behavior }
        : {}),
      ...(p.recurring
        ? {
            recurring: {
              interval: p.recurring.interval,
              interval_count: p.recurring.interval_count,
              ...(p.recurring.trial_period_days
                ? { trial_period_days: p.recurring.trial_period_days }
                : {}),
            },
          }
        : {}),
      metadata: { ...(p.metadata ?? {}), cloned_from: livePriceId },
    })
    priceMap.set(livePriceId, createdPrice.id)
    console.log(`  + ${livePriceId}  ${label}\n      created test price: ${createdPrice.id}`)
  }

  // ---- Coupons --------------------------------------------------------------
  // Recreated under their live ids so the test .env keeps the same coupon lines.
  const uniqueCouponIds = [...new Set(COUPON_VARS.map((v) => fileEnv[v]).filter(Boolean))]
  console.log(`\n── Coupons (${uniqueCouponIds.length} distinct) ──`)

  for (const couponId of uniqueCouponIds) {
    const c = await live.coupons.retrieve(couponId)
    const off =
      c.amount_off != null ? `-${money(c.amount_off, c.currency)}` : `-${c.percent_off}%`
    const label = `${off} (${c.duration})  ${c.name ?? ''}`.trim()

    let alreadyThere = null
    try {
      alreadyThere = await test.coupons.retrieve(couponId)
    } catch {
      // absent in test mode — expected
    }
    if (alreadyThere) {
      const sameOff =
        alreadyThere.amount_off === c.amount_off && alreadyThere.percent_off === c.percent_off
      console.log(
        `  ${sameOff ? '=' : '!'} ${couponId}  ${label}` +
          (sameOff
            ? '\n      exists in test with matching discount'
            : `\n      ⚠ EXISTS IN TEST WITH A DIFFERENT DISCOUNT (${
                alreadyThere.amount_off != null
                  ? `-${money(alreadyThere.amount_off, alreadyThere.currency)}`
                  : `-${alreadyThere.percent_off}%`
              }). Coupon discounts are immutable — delete it in the test dashboard and re-run.`)
      )
      continue
    }

    if (!APPLY) {
      console.log(`  + ${couponId}  ${label}\n      would create in test under the same id`)
      continue
    }

    const created = await test.coupons.create({
      id: couponId, // same id as live, so the .env coupon lines are identical
      name: c.name ?? undefined,
      duration: c.duration,
      ...(c.duration === 'repeating' ? { duration_in_months: c.duration_in_months } : {}),
      ...(c.amount_off != null
        ? { amount_off: c.amount_off, currency: c.currency }
        : { percent_off: c.percent_off }),
    })
    console.log(`  + ${couponId}  ${label}\n      created in test: ${created.id}`)
  }

  // ---- .env block -----------------------------------------------------------
  console.log(`\n── Paste into backend/.env ──\n`)
  console.log(`STRIPE_SECRET_KEY=${TEST_KEY}`)
  console.log(`STRIPE_WEBHOOK_SECRET=<from the test-mode webhook you create next>`)
  for (const v of PRICE_VARS) {
    const liveId = fileEnv[v]
    if (!liveId) continue
    console.log(`${v}=${priceMap.get(liveId)}`)
  }
  for (const v of COUPON_VARS) {
    if (fileEnv[v]) console.log(`${v}=${fileEnv[v]}`)
  }

  if (!APPLY) {
    console.log(`\nDry run only. Re-run with --apply to create these in test mode.`)
  }
  console.log()
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`)
  if (e.raw?.type) console.error(`  Stripe error type: ${e.raw.type}`)
  process.exit(1)
})
