"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type {
  InsightsAPIResponse,
  InsightsLLMResponse,
  InsightStrength,
  InsightImprovementArea,
  InsightPattern,
} from "@/lib/insights-types";

export default function InsightsPage() {
  const [data, setData] = useState<InsightsAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/insights")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load insights");
        return res.json();
      })
      .then((d: InsightsAPIResponse) => setData(d))
      .catch(() => setError("Something went wrong. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: "1.35rem", marginBottom: "1rem" }}>Your Interview Insights</h1>
        <p style={{ color: "var(--muted)" }}>Loading your personalized insights…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 style={{ fontSize: "1.35rem", marginBottom: "1rem" }}>Your Interview Insights</h1>
        <div className="card" style={{ borderColor: "var(--error)" }}>
          <p style={{ color: "var(--error)", margin: 0 }}>{error}</p>
          <Link href="/app/insights" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
            Try again
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (!data.hasEnoughData) {
    return (
      <div>
        <h1 style={{ fontSize: "1.35rem", marginBottom: "1rem" }}>Your Interview Insights</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          Your personalized coach view unlocks after you’ve answered a few questions.
        </p>
        <div className="card" style={{ maxWidth: "28rem" }}>
          <p style={{ margin: "0 0 1rem 0", lineHeight: 1.6 }}>
            You’ve answered <strong>{data.attemptCount}</strong> question{data.attemptCount !== 1 ? "s" : ""}. 
            Answer at least <strong>{data.minAttempts}</strong> to see strengths, improvement areas, and recommended next questions.
          </p>
          <Link href="/app" className="btn btn-primary">
            Continue practice
          </Link>
        </div>
      </div>
    );
  }

  const insights = data.insights as InsightsLLMResponse;
  const questionDetails = "questionDetails" in data ? data.questionDetails : undefined;

  return (
    <div>
      <h1 style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>Your Interview Insights</h1>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Based on {data.attemptCount} practice answers — your personalized coaching snapshot.
      </p>

      {/* Summary */}
      <section style={{ marginBottom: "1.5rem" }}>
        <div className="card insights-summary">
          <p style={{ margin: 0, lineHeight: 1.65, fontSize: "1rem" }}>{insights.summary}</p>
        </div>
      </section>

      {/* Strengths */}
      {insights.strengths && insights.strengths.length > 0 && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", fontWeight: 600 }}>What you’re strong at</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {insights.strengths.map((s: InsightStrength, i: number) => (
              <div key={i} className="card" style={{ padding: "1rem 1.25rem" }}>
                <p style={{ margin: "0 0 0.35rem 0", fontWeight: 600, fontSize: "0.95rem" }}>{s.topic}</p>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.5 }}>{s.reason}</p>
                {s.evidence && (
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>Evidence: {s.evidence}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Improvement areas */}
      {insights.improvement_areas && insights.improvement_areas.length > 0 && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", fontWeight: 600 }}>What to improve</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {insights.improvement_areas.map((a: InsightImprovementArea, i: number) => (
              <div key={i} className="card" style={{ padding: "1rem 1.25rem", borderLeft: "3px solid var(--accent)" }}>
                <p style={{ margin: "0 0 0.35rem 0", fontWeight: 600, fontSize: "0.95rem" }}>{a.topic}</p>
                <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>{a.issue}</p>
                {a.focus_areas && a.focus_areas.length > 0 && (
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "var(--text)" }}>
                    <strong>Focus on:</strong>{" "}
                    {a.focus_areas.map((f, j) => (
                      <span key={j}>
                        {j > 0 && " · "}
                        {f}
                      </span>
                    ))}
                  </p>
                )}
                {a.evidence && (
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>Evidence: {a.evidence}</p>
                )}
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", fontWeight: 500 }}>Recommendation: {a.recommendation}</p>
                {a.recommended_question_slugs && a.recommended_question_slugs.length > 0 && (
                  <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                    <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Five questions to practice (click to answer)
                    </p>
                    <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", listStyle: "decimal" }}>
                      {a.recommended_question_slugs.slice(0, 5).map((slug) => {
                        const detail = questionDetails?.[slug];
                        const label = detail ? (detail.question.slice(0, 150) + (detail.question.length > 150 ? "…" : "")) : `Practice question: ${slug}`;
                        return (
                          <li key={slug} style={{ marginLeft: "0.25rem" }}>
                            <Link
                              href={`/app?question=${encodeURIComponent(slug)}`}
                              style={{ fontSize: "0.9rem", color: "var(--accent)", textDecoration: "none", display: "block", padding: "0.35rem 0", borderBottom: "1px solid transparent" }}
                              className="insights-inline-question-link"
                            >
                              {label}
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Patterns */}
      {insights.patterns && insights.patterns.length > 0 && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", fontWeight: 600 }}>Common patterns</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {insights.patterns.map((p: InsightPattern, i: number) => (
              <div key={i} className="card" style={{ padding: "0.75rem 1rem" }}>
                <p style={{ margin: 0, fontWeight: 500, fontSize: "0.9rem" }}>{p.pattern}</p>
                <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5 }}>{p.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Next steps */}
      {insights.next_steps && insights.next_steps.length > 0 && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", fontWeight: 600 }}>Next steps</h2>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.7 }}>
            {insights.next_steps.map((step: string, i: number) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </section>
      )}

      {/* CTAs */}
      <div className="card" style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/app" className="btn btn-primary">
          Continue practice
        </Link>
        <Link href="/app/scorecard" className="btn btn-ghost">
          View scorecard
        </Link>
      </div>
    </div>
  );
}
