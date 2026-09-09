"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [resendStatus, setResendStatus] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    if (!agreed) { setError("Please agree to the terms and privacy notice to continue."); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (authErr) {
        setError(authErr.message);
        return;
      }
      if (data?.session) {
        router.push("/study");
        return;
      }
      setDone(true);
    } catch (err) {
      setLoading(false);
      setError(err?.message || "An error occurred during signup.");
    }
  }

  async function handleResend() {
    setResendStatus("Resending...");
    try {
      const supabase = createClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (resendErr) {
        setResendStatus("Error: " + resendErr.message);
      } else {
        setResendStatus("Confirmation email resent! Check your inbox.");
      }
    } catch (err) {
      setResendStatus("Could not resend email.");
    }
  }

  if (done) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "16px" }}>
        <div className="card" style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
          <h1 style={{ marginTop: 0, fontSize: 24 }}>Check your email</h1>
          <p style={{ color: "var(--soft)", fontSize: 14, lineHeight: 1.5 }}>
            We sent a confirmation link to <strong style={{ color: "var(--ink)" }}>{email}</strong>.
            Click the link in the email, then come back to log in.
          </p>
          {resendStatus && (
            <p style={{ fontSize: 13, color: resendStatus.startsWith("Error") ? "var(--red)" : "var(--green)" }}>
              {resendStatus}
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            <Link href="/login" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
              Go to login
            </Link>
            <button
              type="button"
              onClick={handleResend}
              style={{ background: "none", border: "none", color: "var(--purple)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Didn&apos;t receive email? Resend
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <form onSubmit={handleSignup} className="card" style={{ width: 340 }}>
        <h1 style={{ marginTop: 0 }}>Sign up</h1>
        <input
          type="email" placeholder="Email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 8, border: "1px solid var(--panel-border)" }}
        />
        <input
          type="password" placeholder="Password (min 6 chars)" required minLength={6} value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 14, borderRadius: 8, border: "1px solid var(--panel-border)" }}
        />
        {error && <p style={{ color: "var(--red)" }}>{error}</p>}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12.5, color: "var(--soft)", lineHeight: 1.5, marginBottom: 14, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 2, flex: "none", width: 15, height: 15, accentColor: "var(--purple)" }}
          />
          <span>
            I agree to the <Link href="/terms">Terms of Use</Link> and{" "}
            <Link href="/terms#privacy">Privacy Notice</Link>. In short: your study data (progress, notes, habits,
            tasks) is stored securely and used only to run the app for you — it&apos;s never sold or shared with third parties.
          </span>
        </label>
        <button className="btn-primary" type="submit" disabled={loading || !agreed} style={{ width: "100%", opacity: agreed ? 1 : 0.6 }}>
          {loading ? "Creating…" : "Create account"}
        </button>
        <p style={{ marginTop: 14, fontSize: 14 }}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
