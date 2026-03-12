"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

type HistoryAttempt = {
  id: string;
  questionAsked: string;
  timestampAsked: string;
  response: string;
  score: number;
  maxScore: number;
};

type HistoryData = {
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  attempts: HistoryAttempt[];
};

export default function AdminUserHistoryPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetch(`/api/admin/users/${id}/history`)
      .then(async (r) => {
        let d: { error?: string } | null = null;
        try {
          d = await r.json();
        } catch {
          setError(r.ok ? "Invalid response" : `${r.status} ${r.statusText}`);
          return;
        }
        if (!r.ok) {
          setError(d?.error ?? r.statusText ?? "Failed to load history");
          return;
        }
        setData(d as HistoryData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load history"))
      .finally(() => setLoading(false));
  }, [id]);

  function formatDate(s: string) {
    return new Date(s).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  }

  const name = data?.user
    ? [data.user.firstName, data.user.lastName].filter(Boolean).join(" ") || "—"
    : "—";

  return (
    <>
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/admin" className="btn btn-ghost" style={{ padding: "0.25rem 0" }}>
          ← Back to users
        </Link>
      </p>
      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : error ? (
        <p style={{ color: "var(--error, #c00)" }}>{error}</p>
      ) : !data ? (
        <p style={{ color: "var(--muted)" }}>No data.</p>
      ) : (
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{name}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>{data.user.email}</p>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>History</h3>
          {data.attempts.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No attempts yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "0.5rem 0.75rem" }}>Time</th>
                    <th style={{ padding: "0.5rem 0.75rem" }}>Question</th>
                    <th style={{ padding: "0.5rem 0.75rem" }}>Response</th>
                    <th style={{ padding: "0.5rem 0.75rem" }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attempts.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap", color: "var(--muted)" }}>
                        {formatDate(a.timestampAsked)}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", maxWidth: "24rem", whiteSpace: "pre-wrap", wordBreak: "break-word", verticalAlign: "top" }}>
                        {a.questionAsked}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", maxWidth: "28rem", whiteSpace: "pre-wrap", wordBreak: "break-word", verticalAlign: "top" }}>
                        {a.response}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>{a.score}/{a.maxScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
