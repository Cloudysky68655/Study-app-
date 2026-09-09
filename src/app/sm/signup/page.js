"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import TopBar from "@/components/sm/TopBar";
import { IconFacebook, IconGoogle, IconCheck } from "@/components/sm/Icons";

export default function SmSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    if (!agreed) { setError("Please agree to the terms and privacy notice to continue."); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data?.user && name.trim()) {
      await supabase.from("user_settings").upsert({ user_id: data.user.id, display_name: name.trim() }, { onConflict: "user_id" });
    }
    if (data?.session) {
      // Email confirmation is off (or auto-confirmed) — a session exists
      // immediately, so continue the real onboarding flow: choose a
      // topic, set a reminder, then land on Home. If confirmation is
      // required there's no session yet, so fall through to the
      // check-your-email screen below instead.
      router.push("/sm/choose-topic");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="sm-screen sm-no-nav">
        <TopBar onBack={() => router.push("/sm/onboarding")} />
        <div className="sm-auth sm-center" style={{ paddingTop: 60 }}>
          <h1 style={{ fontSize: 24 }}>Check your email</h1>
          <p style={{ color: "var(--sm-ink-soft)", marginTop: 12, marginBottom: 26 }}>
            We sent you a confirmation link. Click it, then come back and log in.
          </p>
          <button className="sm-btn sm-btn-primary" onClick={() => router.push("/sm/login")}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sm-screen sm-no-nav">
      <TopBar onBack={() => router.push("/sm/onboarding")} />
      <form className="sm-auth" onSubmit={handleSignup}>
        <h1>Create your account</h1>

        <button type="button" className="sm-btn sm-btn-facebook" style={{ marginBottom: 14 }} disabled>
          <IconFacebook /><span>Continue with Facebook</span>
        </button>
        <button type="button" className="sm-btn sm-btn-google" disabled>
          <IconGoogle /><span>Continue with Google</span>
        </button>

        <div className="sm-auth-divider">Or log in with email</div>

        <div className="sm-field-wrap">
          <input className="sm-field" type="text" placeholder="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          {name && <span className="sm-field-icon"><IconCheck /></span>}
        </div>
        <div className="sm-field-wrap">
          <input className="sm-field" type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {email.includes("@") && <span className="sm-field-icon"><IconCheck /></span>}
        </div>
        <input
          className="sm-field" type="password" placeholder="Password (min 6 chars)" required minLength={6}
          value={password} onChange={(e) => setPassword(e.target.value)}
        />

        <label className="sm-auth-check">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            I have read the <Link href="/terms">Privacy Policy</Link>. Your study data is stored securely and
            never sold or shared with third parties.
          </span>
        </label>

        {error && <p className="sm-auth-error">{error}</p>}

        <button className="sm-btn sm-btn-primary" type="submit" disabled={loading || !agreed}>
          {loading ? "Creating…" : "Get Started"}
        </button>

        <p className="sm-auth-foot">
          Already have an account?{" "}
          <button type="button" className="sm-text-link" onClick={() => router.push("/sm/login")}>Log In</button>
        </p>
      </form>
    </div>
  );
}
