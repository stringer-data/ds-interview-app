"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Breakdown = {
  topics: string[];
  levels: number[];
  data: Record<string, Record<number, { avgScore: number; count: number }>>;
};

export default function ScorecardPage() {
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scorecard/breakdown")
      .then((res) => res.json())
      .then((d) => setBreakdown(d))
      .catch(() => setBreakdown(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ color: "var(--muted)" }}>Loading scorecard…</p>;
  }
  if (!breakdown?.topics?.length) {
    return (
      <div className="card">
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
          No attempts yet. Your scorecard will appear here once you answer some questions.
        </p>
        <Link href="/app" className="btn btn-primary">
          Practice
        </Link>
      </div>
    );
  }

  const levels = breakdown.levels?.length ? breakdown.levels : [1, 2, 3, 4, 5];

  return (
    <div>
      <h1 style={{ fontSize: "1.35rem", marginBottom: "1rem" }}>Scorecard</h1>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Average score by topic and difficulty (score out of 4).
      </p>
      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600 }}>Topic</th>
              {levels.map((level) => (
                <th key={level} style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontWeight: 600 }}>
                  Level {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {breakdown.topics.map((topic) => (
              <tr key={topic} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.6rem 0.75rem" }}>{topic}</td>
                {levels.map((level) => {
                  const cell = breakdown.data[topic]?.[level];
                  const value = cell
                    ? `${cell.avgScore.toFixed(1)}${cell.count > 1 ? ` (${cell.count})` : ""}`
                    : "—";
                  return (
                    <td key={level} style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.85rem" }}>
        Numbers in parentheses are attempt counts for that cell.
      </p>
      <Link href="/app" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
        ← Back to practice
      </Link>
    </div>
  );
}
