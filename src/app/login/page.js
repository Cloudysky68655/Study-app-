"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (authError) {
        const msg = authError.message || "";
        if (msg.toLowerCase().includes("invalid login credentials")) {
          setError("Invalid email or password. If you don't have an account yet, please click Sign up below.");
        } else if (msg.toLowerCase().includes("email not confirmed")) {
          setError("Your email has not been confirmed yet. Please check your inbox or use the link below to resend confirmation.");
        } else {
          setError(msg);
        }
        return;
      }
      if (data?.session) {
        router.push("/study");
      }
    } catch (err) {
      setLoading(false);
      setError(err?.message || "An unexpected error occurred. Please try again.");
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      });
      setLoading(false);
      if (resetError) {
        setError(resetError.message);
      } else {
        setResetSent(true);
        setInfo("Password reset link sent! Please check your email inbox and spam folder.");
      }
    } catch (err) {
      setLoading(false);
      setError(err?.message || "Could not send reset email.");
    }
  }

  async function handleResendConfirmation() {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      setLoading(false);
      if (resendError) {
        setError(resendError.message);
      } else {
        setResendSent(true);
        setInfo("Confirmation email resent! Please check your email inbox (and spam folder).");
      }
    } catch (err) {
      setLoading(false);
      setError(err?.message || "Could not resend confirmation.");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 360 }}>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 24 }}>
          {showForgot ? "Reset Password" : "Log in"}
        </h1>
        <p style={{ color: "var(--soft)", fontSize: 13, marginTop: 0, marginBottom: 18 }}>
          {showForgot
            ? "Enter your email to receive a password reset link."
            : "Sign in to access your Cardio Tracker."}
        </p>

        {showForgot ? (
          <form onSubmit={handleResetPassword}>
            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: 11, marginBottom: 14, borderRadius: 10, border: "1px solid var(--panel-border)" }}
            />
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            {info && <p style={{ color: "var(--green)", fontSize: 13, marginBottom: 12 }}>{info}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: 11 }}>
              {loading ? "Sending link…" : "Send Reset Link"}
            </button>
            <p style={{ marginTop: 16, fontSize: 13, textAlign: "center" }}>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setError(""); setInfo(""); }}
                style={{ background: "none", border: "none", color: "var(--purple)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
              >
                Back to log in
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: 11, marginBottom: 10, borderRadius: 10, border: "1px solid var(--panel-border)" }}
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 11, marginBottom: 8, borderRadius: 10, border: "1px solid var(--panel-border)" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => { setShowForgot(true); setError(""); setInfo(""); }}
                style={{ background: "none", border: "none", color: "var(--soft)", cursor: "pointer", fontSize: 12 }}
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div style={{ background: "color-mix(in srgb, var(--red) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", borderRadius: 8, padding: 10, marginBottom: 14 }}>
                <p style={{ color: "var(--red)", fontSize: 13, margin: 0, lineHeight: 1.4 }}>{error}</p>
                {error.includes("not been confirmed") && !resendSent && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    style={{ marginTop: 6, background: "none", border: "none", color: "var(--purple)", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0 }}
                  >
                    Resend confirmation email
                  </button>
                )}
              </div>
            )}

            {info && (
              <div style={{ background: "color-mix(in srgb, var(--green) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)", borderRadius: 8, padding: 10, marginBottom: 14 }}>
                <p style={{ color: "var(--green)", fontSize: 13, margin: 0 }}>{info}</p>
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: 11 }}>
              {loading ? "Logging in…" : "Log in"}
            </button>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--panel-border)", textAlign: "center", fontSize: 13 }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: "var(--purple)", fontWeight: 700 }}>
                Sign up
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
