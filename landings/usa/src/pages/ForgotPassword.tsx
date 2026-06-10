import { useState } from "react";
import { Link } from "react-router-dom";

const ORANGE = "#F97316";
const BLACK = "#111111";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    console.log("Reset code requested for:", email);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top bar */}
      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-10 h-[56px] md:h-[60px] flex items-center">
          <Link to="/" className="text-[20px] md:text-[22px] font-bold select-none tracking-tight">
            <span style={{ color: BLACK }}>App</span>
            <span style={{ color: ORANGE }}>ex</span>
          </Link>
        </div>
      </header>

      {/* Center form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          <div className="bg-white border border-border rounded-2xl p-7 md:p-10 shadow-card">
            <h1 className="text-foreground text-[26px] font-extrabold text-center mb-1.5 tracking-tight">
              Reset password
            </h1>
            <p className="text-muted-foreground text-[14px] text-center mb-7 leading-relaxed">
              Enter your email and we'll send you a verification code.
            </p>

            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-foreground text-[13px] font-semibold mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-orange-300 transition-all"
                    style={{ background: "#F1F5F9", border: "1px solid transparent", color: BLACK }}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3.5 rounded-xl text-white font-bold text-[15px] border-none cursor-pointer transition-opacity hover:opacity-90"
                  style={{ background: ORANGE }}
                >
                  Get reset code
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#FFF7ED" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p className="text-foreground text-[15px] font-semibold mb-1">Check your email</p>
                <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                  We've sent a verification code to <strong className="text-foreground">{email}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Back to sign in */}
          <p className="text-center text-[13.5px] mt-5" style={{ color: "#475569" }}>
            Already know it? Back to{" "}
            <Link to="/login" className="font-semibold underline underline-offset-2" style={{ color: BLACK }}>
              sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
