"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function SignupForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
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
    if (password !== confirmPassword) {
      setError("Passwords don’t match.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        newsletter_opt_in: newsletterOptIn,
        invite_code: inviteCode || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      const message =
        typeof data?.error === "string"
          ? data.error
          : (() => {
              const fe = data?.error?.fieldErrors;
              if (fe && typeof fe === "object") {
                const first = Object.values(fe).flat().find(Boolean);
                if (first) return first;
              }
              if (Array.isArray(data?.error?.formErrors) && data.error.formErrors[0]) return data.error.formErrors[0];
              return "Signup failed. If this email is already registered, try logging in.";
            })();
      setError(message);
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="first_name">First name (optional)</label>
            <input
              id="first_name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="last_name">Last name (optional)</label>
            <input
              id="last_name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>
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
        <div className="form-group">
          <label htmlFor="confirm_password">Confirm password</label>
          <input
            id="confirm_password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <label className="newsletter-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={newsletterOptIn}
              onChange={(e) => setNewsletterOptIn(e.target.checked)}
            />
            <span>I’d like to receive the newsletter and other product updates</span>
          </label>
        </div>
        {inviteCode && (
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Invite code will be applied.
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Signing up…" : "Sign up"}
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
