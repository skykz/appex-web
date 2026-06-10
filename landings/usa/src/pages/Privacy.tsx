export default function Privacy() {
  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <div className="mx-auto px-5 py-12" style={{ maxWidth: 720 }}>
        <a href="/" className="inline-flex items-center gap-1 mb-8 font-extrabold text-[20px] no-underline">
          <span style={{ color: "#111" }}>App</span><span style={{ color: "#F97316" }}>ex</span>
        </a>
        <h1 className="text-[32px] font-extrabold mb-2" style={{ color: "#111" }}>Privacy Policy</h1>
        <p className="text-[14px] mb-8" style={{ color: "#6B7280" }}>Last updated: May 29, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed" style={{ color: "#374151" }}>
          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as your name, email address, and quiz responses. We also collect usage data automatically when you interact with our Service, including pages visited, time spent, and device/browser information.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, personalize, and improve the Service; process transactions; send you course-related communications and updates; and comply with legal obligations. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>3. Cookies and Tracking</h2>
            <p>We use cookies and similar tracking technologies to operate and improve the Service, remember your preferences, and analyze usage patterns. You can control cookie settings through your browser. Disabling cookies may affect certain features of the Service.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>4. Data Sharing</h2>
            <p>We may share your information with trusted service providers who assist us in operating the Service (e.g., payment processors, email providers), subject to confidentiality agreements. We may also disclose information if required by law or to protect our legal rights.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>5. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active or as needed to provide you with the Service. You may request deletion of your account and associated data at any time by contacting hello@appex.me.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>6. Your Rights (CCPA / US)</h2>
            <p>If you are a California resident, you have the right to know what personal information we collect, request deletion of your data, and opt out of any sale of personal information (we do not sell personal data). To exercise these rights, contact us at hello@appex.me.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>7. Security</h2>
            <p>We implement industry-standard security measures to protect your data, including encryption in transit (TLS) and at rest. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>8. Children's Privacy</h2>
            <p>The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us at hello@appex.me.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice on the Service. Your continued use of the Service after changes are posted constitutes your acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-3" style={{ color: "#111" }}>10. Contact</h2>
            <p>For privacy-related questions or requests, contact us at <a href="mailto:hello@appex.me" style={{ color: "#F97316" }}>hello@appex.me</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
