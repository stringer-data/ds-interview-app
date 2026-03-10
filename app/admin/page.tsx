"use client";

import { useState, useEffect } from "react";

type UserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  tier: string;
  newsletterOptIn: boolean;
  signupSource: string;
  loginCount: number;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  questionsAnswered: number;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [inviteTier, setInviteTier] = useState<"free" | "paid">("paid");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteeName, setInviteeName] = useState("");
  const [createdInvite, setCreatedInvite] = useState<{ invite_link: string; invite_code: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editTier, setEditTier] = useState<"free" | "paid">("free");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    setLoadError(null);
    fetch("/api/admin/users")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setLoadError(d?.error ?? r.statusText ?? "Failed to load users");
          return;
        }
        setUsers(Array.isArray(d.users) ? d.users : []);
      })
      .catch(() => setLoadError("Failed to load users"))
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
          invitee_name: inviteeName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) setCreatedInvite({ invite_link: data.invite_link, invite_code: data.invite_code });
    } finally {
      setActionLoading(false);
    }
  }

  function openEdit(user: UserRow) {
    setEditingUser(user);
    setEditFirstName(user.firstName ?? "");
    setEditLastName(user.lastName ?? "");
    setEditTier(user.tier as "free" | "paid");
  }

  async function saveEdit() {
    if (!editingUser) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editFirstName.trim() || null,
          last_name: editLastName.trim() || null,
          tier: editTier,
        }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? { ...u, firstName: editFirstName.trim() || null, lastName: editLastName.trim() || null, tier: editTier }
              : u
          )
        );
        setEditingUser(null);
      }
    } finally {
      setEditSaving(false);
    }
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
            <label>Invitee name (optional)</label>
            <input
              type="text"
              value={inviteeName}
              onChange={(e) => setInviteeName(e.target.value)}
              placeholder="e.g. Jane Doe"
              style={{ width: "160px" }}
            />
          </div>
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
        ) : loadError ? (
          <p style={{ color: "var(--error, #c00)" }}>{loadError}</p>
        ) : users.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No users yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Name</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Email</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Tier</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Source</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Newsletter</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Logins</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>First login</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Last login</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Questions</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{u.email}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{u.tier}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: "var(--muted)" }}>{u.signupSource}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{u.newsletterOptIn ? "Yes" : "—"}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{u.loginCount}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: "var(--muted)" }}>{formatDate(u.firstLoginAt)}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: "var(--muted)" }}>{formatDate(u.lastLoginAt)}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{u.questionsAnswered}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                        onClick={() => openEdit(u)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
          onClick={() => !editSaving && setEditingUser(null)}
        >
          <div
            className="card"
            style={{ minWidth: "320px", maxWidth: "90vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "1rem" }}>Edit user</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>{editingUser.email}</p>
            <div className="form-group">
              <label>First name</label>
              <input
                type="text"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div className="form-group">
              <label>Last name</label>
              <input
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div className="form-group">
              <label>Tier</label>
              <select
                value={editTier}
                onChange={(e) => setEditTier(e.target.value as "free" | "paid")}
                style={{ width: "100%", padding: "0.6rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingUser(null)} disabled={editSaving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
