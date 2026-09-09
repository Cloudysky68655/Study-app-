"use client";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", minHeight: "100vh", padding: "40px 20px" }}>
      <div className="card" style={{ maxWidth: 640, width: "100%" }}>
        <Link href="/signup" style={{ fontSize: 13, color: "var(--soft)" }}>&larr; Back to sign up</Link>
        <h1 style={{ marginTop: 14 }}>Terms of Use &amp; Privacy Notice</h1>
        <p style={{ color: "var(--soft)", fontSize: 13 }}>Plain-language summary — this app is currently free to use, built for personal study tracking.</p>

        <h2 style={{ fontSize: 17, marginTop: 26 }}>Terms of use</h2>
        <ul style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink)" }}>
          <li>This app is a personal study/life-tracking tool. It&apos;s provided as-is, with no guarantee it&apos;ll always be available or bug-free.</li>
          <li>All content is currently free to use — there is no charge for any feature.</li>
          <li>Don&apos;t misuse the account system (sharing credentials to abuse redeem codes, attempting to access other users&apos; data, etc.).</li>
          <li>The medical/study content is a personal study aid, not professional medical or educational advice.</li>
        </ul>

        <h2 id="privacy" style={{ fontSize: 17, marginTop: 26 }}>Privacy notice</h2>
        <ul style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink)" }}>
          <li><b>What&apos;s collected:</b> your email/password (for login), and whatever you enter into the app — study progress, notes, habits, tasks, and preferences.</li>
          <li><b>Why:</b> solely to run the app for you — sync your data across devices and show your own progress back to you.</li>
          <li><b>Who sees it:</b> only you. Your data isn&apos;t sold, shared with advertisers, or used to train anything.</li>
          <li><b>Where it&apos;s stored:</b> in a Supabase-hosted database, protected by row-level security so only your own signed-in account can read or write your rows.</li>
          <li><b>Your control:</b> you can ask for your account and data to be deleted at any time.</li>
        </ul>

        <p style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 22 }}>
          This is a short, plain-language summary rather than a formal legal document, since this is a personal/free
          project rather than a commercial service.
        </p>
      </div>
    </div>
  );
}
