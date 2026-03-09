"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) setInviteCode(invite);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        invite_code: inviteCode || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Signup failed.");
      return;
    }
    setRedirecting(true);
    // Sign them in and send to dashboard (no extra login step)
    await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      callbackUrl: "/app",
      redirect: true,
    });
  }

  if (redirecting) {
    return (
      <div className="container" style={{ paddingTop: "3rem", maxWidth: "400px", textAlign: "center" }}>
        <p style={{ color: "var(--muted)" }}>Redirecting to your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "3rem", maxWidth: "400px" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Sign up</h1>
      <form onSubmit={handleSubmit} className="card">
        {error && (
          <p style={{ color: "var(--error)", marginBottom: "1rem", fontSize: "0.9rem" }}>
            {error}
          </p>
        )}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password (min 8 characters)</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {inviteCode && (
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Invite code will be applied.
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.9rem" }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: "3rem" }}>Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
