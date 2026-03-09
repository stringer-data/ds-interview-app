"use client";

import { useState, useEffect } from "react";

type UserRow = {
  id: string;
  email: string;
  tier: string;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  questionsAnswered: number;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [inviteTier, setInviteTier] = useState<"free" | "paid">("paid");
  const [inviteEmail, setInviteEmail] = useState("");
  const [createdInvite, setCreatedInvite] = useState<{ invite_link: string; invite_code: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setUsers(d.users);
      })
      .finally(() => setLoading(false));
  }, []);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setCreatedInvite(null);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier_to_grant: inviteTier,
          email: inviteEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) setCreatedInvite({ invite_link: data.invite_link, invite_code: data.invite_code });
    } finally {
      setActionLoading(false);
    }
  }

  async function setTier(userId: string, tier: "free" | "paid") {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, tier } : u)));
  }

  function formatDate(s: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <>
      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>Create invite</h2>
        <form onSubmit={createInvite} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Email (optional)</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="leave blank for link-only"
              style={{ width: "220px" }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Tier to grant</label>
            <select
              value={inviteTier}
              onChange={(e) => setInviteTier(e.target.value as "free" | "paid")}
              style={{ padding: "0.6rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={actionLoading}>
            {actionLoading ? "Creating…" : "Create invite"}
          </button>
        </form>
        {createdInvite && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--bg)", borderRadius: 8, fontSize: "0.9rem" }}>
            <p style={{ marginBottom: "0.5rem" }}>Invite link (copy and share):</p>
            <code style={{ wordBreak: "break-all" }}>{createdInvite.invite_link}</code>
          </div>
        )}
      </section>

      <section className="card">
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>Users</h2>
        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading…</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Email</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Tier</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>First login</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Last login</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Questions</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Set tier</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{u.email}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{u.tier}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: "var(--muted)" }}>{formatDate(u.firstLoginAt)}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: "var(--muted)" }}>{formatDate(u.lastLoginAt)}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{u.questionsAnswered}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                        onClick={() => setTier(u.id, u.tier === "paid" ? "free" : "paid")}
                      >
                        Set {u.tier === "paid" ? "Free" : "Paid"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
