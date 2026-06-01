export default function Subscription() {
  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <div className="mx-auto px-5 py-12" style={{ maxWidth: 720 }}>
        <a href="/" className="inline-flex items-center gap-1 mb-8 font-extrabold text-[20px] no-underline">
          <span style={{ color: "#111" }}>App</span><span style={{ color: "#FF6B35" }}>ex</span>
        </a>
        <h1 className="text-[32px] font-extrabold mb-2" style={{ color: "#111" }}>Subscription Terms</h1>
        <p className="text-[14px] mb-8" style={{ color: "#6B7280" }}>Last updated: May 29, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed" style={{ color: "#374151" }}>
          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>1. Subscription Plans</h2>
            <p>Appex offers the following introductory subscription plans:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>1 Week:</strong> $5.15 introductory, then $17.77/week</li>
              <li><strong>4 Weeks:</strong> $11.29 introductory, then $38.95/4 weeks</li>
              <li><strong>12 Weeks:</strong> $19.29 introductory, then $66.65/12 weeks</li>
            </ul>
            <p className="mt-3">All prices are in US dollars (USD). A $1.00 temporary authorization charge may be applied to verify your payment method; this charge is fully refunded within 1–3 business days.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>2. Automatic Renewal</h2>
            <p>Your subscription automatically renews at the end of each billing period at the standard (non-introductory) rate unless you cancel before the renewal date. By subscribing, you explicitly authorize Appex Inc. to charge your payment method on a recurring basis.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>3. How to Cancel</h2>
            <p>You may cancel your subscription at any time by:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Visiting your Account Settings → Subscription → Cancel</li>
              <li>Emailing <a href="mailto:support@appex.me" style={{ color: "#FF6B35" }}>support@appex.me</a> with subject line "Cancel Subscription"</li>
            </ul>
            <p className="mt-3">Cancellation is effective at the end of the current billing period. You will retain access to the Service until then. No partial refunds are issued for unused days within a billing period unless required by applicable law.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>4. Money-Back Guarantee</h2>
            <p>If you complete the required coursework and are not satisfied with your results, you may request a full refund within 30 days of your initial purchase. Contact <a href="mailto:support@appex.me" style={{ color: "#FF6B35" }}>support@appex.me</a> with proof of course engagement. Refunds are processed within 5–10 business days.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>5. Payment Methods</h2>
            <p>We accept major credit and debit cards (Visa, Mastercard, American Express, Discover) and Apple Pay where supported. All transactions are processed securely via our payment processor. Appex does not store your full card number.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>6. Price Changes</h2>
            <p>We reserve the right to adjust subscription prices. We will notify you at least 14 days before any price change takes effect via the email associated with your account. If you do not cancel before the new price takes effect, you authorize us to charge the updated amount.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>7. Failed Payments</h2>
            <p>If a payment fails, we will attempt to re-charge your payment method up to three times over 7 days. If payment is not received, your account will be suspended until the outstanding balance is resolved.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>8. Contact</h2>
            <p>For billing questions, contact <a href="mailto:support@appex.me" style={{ color: "#FF6B35" }}>support@appex.me</a> or visit your Account Settings.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
