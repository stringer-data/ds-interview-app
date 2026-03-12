"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ALL_TOPICS, topicToSlug } from "@/lib/topics";

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

  const levels = breakdown?.levels?.length ? breakdown.levels : [1, 2, 3, 4, 5];
  const data = breakdown?.data ?? {};
  const hasAttempts = breakdown?.topics?.length ? true : false;

  return (
    <div>
      <h1 style={{ fontSize: "1.35rem", marginBottom: "1rem" }}>Scorecard</h1>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Average score by topic and difficulty (score out of 4). Click a topic to practice that topic.
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
            {ALL_TOPICS.map((topic) => (
              <tr key={topic} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  <Link
                    href={`/app?topic=${encodeURIComponent(topicToSlug(topic))}`}
                    style={{ color: "var(--text)", textDecoration: "underline", fontWeight: 500 }}
                  >
                    {topic}
                  </Link>
                </td>
                {levels.map((level) => {
                  const cell = data[topic]?.[level];
                  const value = cell
                    ? `${cell.avgScore.toFixed(1)} (${cell.count})`
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
        {hasAttempts ? "Numbers in parentheses are attempt counts for that cell. " : ""}
        Levels: 1 = definition, 2 = intuition, 3 = applied product, 4 = technical/assumptions, 5 = hard case.
      </p>
      {!hasAttempts && (
        <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.85rem" }}>
          No attempts yet. Click a topic above to start practicing.
        </p>
      )}
      <Link href="/app" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
        ← Back to practice
      </Link>
    </div>
  );
}
