import { useState } from "react";
import { Link } from "react-router-dom";

const ORANGE = "#F97316";
const BLACK = "#111111";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Frontend stub — wire up to auth backend later
    console.log("Sign-in attempt:", email);
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
              Welcome back
            </h1>
            <p className="text-muted-foreground text-[14px] text-center mb-7">
              Log in to your Appex account
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
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

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-foreground text-[13px] font-semibold mb-2">
                  Password
                </label>
                <div className="flex gap-2">
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="flex-1 min-w-0 rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-orange-300 transition-all"
                    style={{ background: "#F1F5F9", border: "1px solid transparent", color: BLACK }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="w-11 rounded-xl flex items-center justify-center bg-transparent border cursor-pointer"
                    style={{ borderColor: "hsl(var(--border))", color: "#475569" }}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 015.06-5.94M9.9 4.24A10.93 10.93 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Sign-in button */}
              <button
                type="submit"
                className="w-full mt-2 py-3.5 rounded-xl text-white font-bold text-[15px] border-none cursor-pointer transition-opacity hover:opacity-90"
                style={{ background: ORANGE }}
              >
                Sign in
              </button>
            </form>

            {/* Forgot password */}
            <div className="text-center mt-5">
              <Link
                to="/forgot-password"
                className="text-[13.5px] underline underline-offset-2 transition-colors"
                style={{ color: "#475569" }}
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Sign-up note */}
          <p className="text-center text-[13.5px] mt-5" style={{ color: "#475569" }}>
            Don't have an account?{" "}
            <Link to="/quiz" className="font-semibold underline underline-offset-2" style={{ color: BLACK }}>
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
