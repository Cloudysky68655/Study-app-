"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import TopBar from "@/components/sm/TopBar";
import { IconFacebook, IconGoogle, IconEye } from "@/components/sm/Icons";

export default function SmLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/sm/home");
  }

  return (
    <div className="sm-screen sm-no-nav">
      <TopBar onBack={() => router.push("/sm/onboarding")} />
      <form className="sm-auth" onSubmit={handleLogin}>
        <h1>Welcome Back!</h1>

        <button type="button" className="sm-btn sm-btn-facebook" style={{ marginBottom: 14 }} disabled>
          <IconFacebook /><span>Continue with Facebook</span>
        </button>
        <button type="button" className="sm-btn sm-btn-google" disabled>
          <IconGoogle /><span>Continue with Google</span>
        </button>

        <div className="sm-auth-divider">Or log in with email</div>

        <input
          className="sm-field" type="email" placeholder="Email address" required
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <div className="sm-field-wrap">
          <input
            className="sm-field" type={showPw ? "text" : "password"} placeholder="Password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="sm-field-icon" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sm-ink-soft)" }} onClick={() => setShowPw((v) => !v)} aria-label="Toggle password visibility">
            <IconEye open={!showPw} />
          </button>
        </div>

        {error && <p className="sm-auth-error">{error}</p>}

        <button className="sm-btn sm-btn-primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? "Logging in…" : "Log In"}
        </button>

        <p style={{ textAlign: "center", marginTop: 18 }}>
          <span className="sm-text-link" style={{ color: "var(--sm-ink)", fontWeight: 700 }}>Forgot Password?</span>
        </p>

        <p className="sm-auth-foot">
          Already have an account?{" "}
          <button type="button" className="sm-text-link" onClick={() => router.push("/sm/signup")}>Sign Up</button>
        </p>
      </form>
    </div>
  );
}
