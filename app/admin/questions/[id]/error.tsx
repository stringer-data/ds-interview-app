"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function QuestionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Question detail error:", error);
  }, [error]);

  return (
    <section className="card">
      <h2 style={{ fontSize: "1.1rem" }}>Something went wrong</h2>
      <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>{error.message}</p>
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/admin/questions" className="btn btn-ghost">
          Back to questions
        </Link>
      </div>
    </section>
  );
}
