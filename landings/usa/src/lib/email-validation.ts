/**
 * Email validation for the funnel's lead capture.
 *
 * Deliberately NOT an RFC-complete implementation: those regexes are enormous and
 * routinely reject valid addresses (plus-addressing, new long TLDs, unicode
 * locals). Since this gates the single most valuable step in the funnel — step 31
 * of 33, where the visitor is nearly a customer — a false rejection costs far more
 * than letting a rare oddity through.
 *
 * The strategy is therefore: reject only what is *certainly* wrong, and for the
 * merely *suspicious* (a domain that looks like a typo) suggest a correction
 * instead of blocking.
 */

/**
 * Structural check. Beyond the old "something@something.something" it also
 * requires a plausible TLD and rejects the malformed-dot cases that regex let
 * through (`a@b..com`, `.a@b.com`, `a@-b.com`).
 *
 * ASCII-only, deliberately: the backend validates with zod's `.email()`, which
 * rejects non-ASCII locals (verified against production — `müller@web.de`
 * returns 400). Accepting them here would be worse than rejecting them: the
 * visitor would sail past this screen and the lead would be silently dropped by
 * the API. Better a message they can act on than a lost lead.
 *
 * If internationalised addresses matter later, widen the BACKEND schema first,
 * then this pattern — never the other way round.
 */
const SHAPE =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

/**
 * Disposable / throwaway providers. These convert at ~zero: the visitor grabs the
 * lead magnet and the address dies, so on paid traffic we'd be buying a click for
 * an unreachable contact. Blocked outright rather than warned about, because
 * nobody types a mailinator address by accident.
 */
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', 'guerrillamail.com', 'guerrillamail.net',
  'mailinator.com', 'maildrop.cc', 'temp-mail.org', 'tempmail.com', 'tempmail.net',
  'throwawaymail.com', 'yopmail.com', 'getnada.com', 'trashmail.com', 'sharklasers.com',
  'grr.la', 'dispostable.com', 'fakeinbox.com', 'mytemp.email', 'moakt.com',
  'emailondeck.com', 'mohmal.com', 'burnermail.io', 'spamgourmet.com', 'mailnesia.com',
]);

/**
 * Placeholder domains that only ever appear in our own testing. Excluded in
 * production so internal probes don't inflate the lead count and distort the
 * conversion rate — 12 of the first 33 rows in the DB were exactly this.
 */
const TEST_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net', 'test.com', 'test.net',
  'localhost', 'invalid', 'df.com',
]);

/** Domains people mistype most, mapped to what they meant. */
const TYPO_MAP: Record<string, string> = {
  // gmail
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com', 'gmailc.om': 'gmail.com', 'gmaill.com': 'gmail.com',
  'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.con': 'gmail.com',
  'gmail.om': 'gmail.com', 'gamil.com': 'gmail.com', 'gmaul.com': 'gmail.com',
  // outlook / hotmail
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com', 'outlook.co': 'outlook.com', 'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  // yahoo
  'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com', 'yahooo.com': 'yahoo.com',
  // icloud
  'iclould.com': 'icloud.com', 'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com',
};

export type EmailCheck =
  /** Safe to submit. */
  | { status: 'ok' }
  /** Cannot be submitted; `message` is shown to the visitor. */
  | { status: 'invalid'; message: string }
  /**
   * Probably a typo. The visitor may still submit as-is — `suggestion` is offered
   * as a one-tap fix. Never blocks: a real address that merely looks odd must not
   * be turned away at the most valuable step of the funnel.
   */
  | { status: 'suggest'; suggestion: string; message: string };

/**
 * Validates an address for lead capture.
 *
 * @param raw       what the visitor typed
 * @param isProd    when false, test domains (example.com…) are allowed so local
 *                  and preview runs can still complete the funnel
 */
export function checkEmail(raw: string, isProd = import.meta.env.PROD): EmailCheck {
  const email = raw.trim().toLowerCase();

  if (!email) return { status: 'invalid', message: 'Please enter your email.' };
  // 320 = 64 local + @ + 255 domain, the practical maximum; also what the backend
  // zod schema enforces, so a longer value would fail server-side anyway.
  if (email.length > 320) return { status: 'invalid', message: 'That email is too long.' };
  if (!SHAPE.test(email)) {
    // Name the actual problem when it's accented characters: "invalid email" on an
    // address the visitor knows is theirs reads as a broken form, and they leave.
    // Latin-1+ letters are the common case (José, Müller) — say what to change.
    if (/[^\x20-\x7E]/.test(email)) {
      return {
        status: 'invalid',
        message: 'Please use the Latin alphabet without accents (e.g. jose instead of josé).',
      };
    }
    return { status: 'invalid', message: 'Please enter a valid email address.' };
  }

  const domain = email.slice(email.lastIndexOf('@') + 1);

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      status: 'invalid',
      message: 'Please use a permanent email — we send your plan and access link there.',
    };
  }

  if (isProd && TEST_DOMAINS.has(domain)) {
    return { status: 'invalid', message: 'Please enter a real email address.' };
  }

  const fix = TYPO_MAP[domain];
  if (fix) {
    const suggestion = email.slice(0, email.lastIndexOf('@') + 1) + fix;
    return { status: 'suggest', suggestion, message: `Did you mean ${suggestion}?` };
  }

  return { status: 'ok' };
}

/** True when the address may be submitted (typo suggestions still count). */
export function isSubmittableEmail(raw: string, isProd?: boolean): boolean {
  const r = checkEmail(raw, isProd);
  return r.status === 'ok' || r.status === 'suggest';
}
