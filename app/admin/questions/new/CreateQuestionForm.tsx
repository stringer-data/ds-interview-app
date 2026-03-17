"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DIFFICULTY_LEVEL_OPTIONS,
  QUESTION_CATEGORIES,
} from "@/lib/question-admin";

type Topic = { id: number; name: string; slug: string };
type Theme = { id: number; name: string; slug: string };

type Props = {
  topics: Topic[];
  themes: Theme[];
};

const sectionStyle = {
  marginTop: "1.5rem",
  padding: "1rem",
  border: "1px solid var(--border, #ddd)",
  borderRadius: "var(--radius, 6px)",
} as const;

const inputStyle = { width: "100%", padding: "0.5rem", fontSize: "0.9rem" };
const labelStyle = { display: "block" as const, fontSize: "0.9rem" as const, marginBottom: "0.25rem" as const };

export function CreateQuestionForm({ topics, themes }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [topicSlug, setTopicSlug] = useState(topics[0]?.slug ?? "");
  const [themeSlug, setThemeSlug] = useState(themes[0]?.slug ?? "");
  const [question, setQuestion] = useState("");
  const [referenceAnswer, setReferenceAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim(),
          topic_slug: topicSlug,
          theme_slug: themeSlug,
          difficulty_level: difficultyLevel,
          question: question.trim(),
          reference_answer: referenceAnswer.trim() || null,
          category: category.trim() || null,
          tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
          active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? res.statusText ?? "Create failed");
        return;
      }
      router.push(`/admin/questions/${(data as { id: number }).id}?created=1`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={sectionStyle}>
      <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Create question</h3>
      {error && (
        <p style={{ color: "var(--error, #c00)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
          {error}
        </p>
      )}
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="create-slug" style={labelStyle}>
          Slug (unique ID, e.g. causal_basics_01)
        </label>
        <input
          id="create-slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          style={inputStyle}
          placeholder="e.g. causal_basics_01"
        />
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="create-topic" style={labelStyle}>
          Topic
        </label>
        <select
          id="create-topic"
          value={topicSlug}
          onChange={(e) => setTopicSlug(e.target.value)}
          style={inputStyle}
        >
          {topics.map((t) => (
            <option key={t.id} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="create-theme" style={labelStyle}>
          Theme
        </label>
        <select
          id="create-theme"
          value={themeSlug}
          onChange={(e) => setThemeSlug(e.target.value)}
          style={inputStyle}
        >
          {themes.map((t) => (
            <option key={t.id} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="create-question" style={labelStyle}>
          Question text
        </label>
        <textarea
          id="create-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          required
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="create-reference" style={labelStyle}>
          Reference answer
        </label>
        <textarea
          id="create-reference"
          value={referenceAnswer}
          onChange={(e) => setReferenceAnswer(e.target.value)}
          rows={4}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="create-category" style={labelStyle}>
          Category
        </label>
        <select
          id="create-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          <option value="">—</option>
          {QUESTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="create-tags" style={labelStyle}>
          Tags (comma-separated; spaces become hyphens)
        </label>
        <input
          id="create-tags"
          type="text"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="e.g. experimentation, gen ai, metrics"
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="create-difficulty" style={labelStyle}>
          Difficulty
        </label>
        <select
          id="create-difficulty"
          value={difficultyLevel}
          onChange={(e) => setDifficultyLevel(Number(e.target.value))}
          style={inputStyle}
        >
          {DIFFICULTY_LEVEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Creating…" : "Create"}
        </button>
        <a href="/admin/questions" className="btn btn-ghost">
          Cancel
        </a>
      </div>
    </form>
  );
}
