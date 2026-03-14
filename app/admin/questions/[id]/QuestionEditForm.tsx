"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DIFFICULTY_LEVEL_OPTIONS,
  QUESTION_CATEGORIES,
  getDifficultyLabel,
} from "@/lib/question-admin";

type TopicOption = { id: number; name: string; slug: string };
type ThemeOption = { id: number; name: string; slug: string };

type Props = {
  questionId: number;
  topicName: string;
  themeName: string;
  initialTopicId: number;
  initialThemeId: number;
  topics: TopicOption[];
  themes: ThemeOption[];
  initialQuestion: string;
  initialReferenceAnswer: string | null;
  initialDifficultyLevel: number;
  initialActive: boolean;
  initialCategory: string | null;
  initialTags: string[];
};

const sectionStyle = {
  marginTop: "1.5rem",
  padding: "1rem",
  border: "1px solid var(--border, #ddd)",
  borderRadius: "var(--radius, 6px)",
} as const;

export function QuestionEditForm({
  questionId,
  topicName,
  themeName,
  initialTopicId,
  initialThemeId,
  topics,
  themes,
  initialQuestion,
  initialReferenceAnswer,
  initialDifficultyLevel,
  initialActive,
  initialCategory,
  initialTags,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [topicId, setTopicId] = useState(initialTopicId);
  const [themeId, setThemeId] = useState(initialThemeId);
  const [question, setQuestion] = useState(initialQuestion);
  const [referenceAnswer, setReferenceAnswer] = useState(initialReferenceAnswer ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [tagsStr, setTagsStr] = useState(initialTags.length ? initialTags.join(", ") : "");
  const [difficultyLevel, setDifficultyLevel] = useState(initialDifficultyLevel);
  const [active, setActive] = useState(initialActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          reference_answer: referenceAnswer.trim() || null,
          difficulty_level: difficultyLevel,
          active,
          category: category.trim() || null,
          tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
          topic_id: topicId,
          theme_id: themeId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? res.statusText ?? "Update failed");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div style={sectionStyle}>
        <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
          <span>{topicName}</span> · <span>{themeName}</span> ·{" "}
          <span>Difficulty {getDifficultyLabel(initialDifficultyLevel)}</span> ·{" "}
          <span>{initialActive ? "Active" : "Inactive"}</span>
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Question text</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{initialQuestion}</p>
        </div>
        {initialReferenceAnswer && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Reference answer</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{initialReferenceAnswer}</p>
          </div>
        )}
        <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          <p>
            <strong>Category:</strong> {initialCategory ?? "—"}
          </p>
          <p>
            <strong>Tags:</strong>{" "}
            {initialTags.length > 0 ? initialTags.join(", ") : "—"}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setEditing(true)}
        >
          Edit question
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={sectionStyle}
    >
      <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Edit question</h3>
      {error && (
        <p style={{ color: "var(--error, #c00)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
          {error}
        </p>
      )}
      {topics.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="edit-topic" style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
            Topic
          </label>
          <select
            id="edit-topic"
            value={topicId}
            onChange={(e) => setTopicId(Number(e.target.value))}
            style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem" }}
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {themes.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="edit-theme" style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
            Theme
          </label>
          <select
            id="edit-theme"
            value={themeId}
            onChange={(e) => setThemeId(Number(e.target.value))}
            style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem" }}
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="edit-question" style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
          Question text
        </label>
        <textarea
          id="edit-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          required
          style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem" }}
        />
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="edit-reference" style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
          Reference answer
        </label>
        <textarea
          id="edit-reference"
          value={referenceAnswer}
          onChange={(e) => setReferenceAnswer(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem" }}
        />
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="edit-category" style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
          Category
        </label>
        <select
          id="edit-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem" }}
        >
          <option value="">—</option>
          {category && !QUESTION_CATEGORIES.includes(category as (typeof QUESTION_CATEGORIES)[number]) && (
            <option value={category}>{category}</option>
          )}
          {QUESTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="edit-tags" style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
          Tags (comma-separated; spaces become hyphens, e.g. gen ai → gen-ai)
        </label>
        <input
          id="edit-tags"
          type="text"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="e.g. experimentation, gen ai, metrics"
          style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem" }}
        />
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="edit-difficulty" style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
          Difficulty
        </label>
        <select
          id="edit-difficulty"
          value={difficultyLevel}
          onChange={(e) => setDifficultyLevel(Number(e.target.value))}
          style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem" }}
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
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setEditing(false);
            setTopicId(initialTopicId);
            setThemeId(initialThemeId);
            setQuestion(initialQuestion);
            setReferenceAnswer(initialReferenceAnswer ?? "");
            setCategory(initialCategory ?? "");
            setTagsStr(initialTags.length ? initialTags.join(", ") : "");
            setDifficultyLevel(initialDifficultyLevel);
            setActive(initialActive);
            setError(null);
          }}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
