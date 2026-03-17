"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PREVIEW_LENGTH = 180;

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

type RelatedItem = { id: number; slug: string; question?: string };

export function RelatedQuestionsSection({ questionId }: { questionId: number }) {
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/questions/${questionId}/related?k=5`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = (data as { error?: string }).error ?? res.statusText;
          throw new Error(msg);
        }
        return data as { related?: RelatedItem[]; slugs?: string[] };
      })
      .then((data) => {
        if (cancelled) return;
        const list = data.related ?? (data.slugs ?? []).map((slug) => ({ id: 0, slug }));
        setRelated(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  return (
    <section style={{ marginBottom: "1.25rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.25rem 0", color: "var(--muted)" }}>
        Related questions
      </h3>
      <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", color: "var(--muted)", maxWidth: "36rem" }}>
        Similar by meaning (from question + reference text), not just keywords. Use these to link practice sets or spot near-duplicates.
      </p>
      {loading && <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>Loading…</p>}
      {error && (
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--error, #c00)" }}>{error}</p>
      )}
      {!loading && !error && related.length === 0 && (
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
          No related questions. Run the backfill script or add more questions (with embeddings) to see similar questions.
        </p>
      )}
      {!loading && !error && related.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem", listStyle: "disc" }}>
          {related.map((item) => (
            <li key={item.id} style={{ marginBottom: "0.6rem" }}>
              <Link href={`/admin/questions/${item.id}`} className="link" title={item.question ?? item.slug}>
                {item.question != null && item.question !== ""
                  ? truncate(item.question, PREVIEW_LENGTH)
                  : item.slug}
              </Link>
              {item.question != null && item.question !== "" && item.question.length > PREVIEW_LENGTH && (
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}> ({item.slug})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
