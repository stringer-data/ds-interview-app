"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

type Account = { email: string; tier: string };

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((res) => res.json())
      .then((d) => setAccount(d))
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation don't match." });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordMessage({ type: "error", text: data.error ?? "Failed to update password." });
        return;
      }
      setPasswordMessage({ type: "ok", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setPasswordLoading(false);
    }
  }

  if (loading) {
    return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  }
  if (!account) {
    return (
      <p style={{ color: "var(--muted)" }}>
        Could not load account. <Link href="/app">Back to practice</Link>.
      </p>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.35rem", marginBottom: "1rem" }}>Account settings</h1>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Profile</h2>
        <dl style={{ margin: 0, fontSize: "0.95rem" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <dt style={{ color: "var(--muted)", marginBottom: "0.2rem" }}>Email</dt>
            <dd style={{ margin: 0 }}>{account.email}</dd>
          </div>
          <div>
            <dt style={{ color: "var(--muted)", marginBottom: "0.2rem" }}>Plan</dt>
            <dd style={{ margin: 0 }}>{account.tier === "paid" ? "Paid" : "Free"}</dd>
          </div>
        </dl>
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Appearance</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
          Switch between dark and light mode.
        </p>
        <ThemeToggle showLabel />
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Change password</h2>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-password">New password (min 8 characters)</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {passwordMessage && (
            <p
              style={{
                marginBottom: "1rem",
                fontSize: "0.9rem",
                color: passwordMessage.type === "ok" ? "var(--success)" : "var(--error)",
              }}
            >
              {passwordMessage.text}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
            {passwordLoading ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      <Link href="/app" className="btn btn-ghost">
        ← Back to practice
      </Link>
    </div>
  );
}
