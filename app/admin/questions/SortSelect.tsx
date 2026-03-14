"use client";

import { useRouter } from "next/navigation";

export type SortValue =
  | ""
  | "times_asked_asc"
  | "times_asked_desc"
  | "created_at_asc"
  | "created_at_desc"
  | "avg_score_asc"
  | "avg_score_desc"
  | "avg_rating_asc"
  | "avg_rating_desc";

type Props = {
  currentSort: SortValue;
  topicSlug: string | undefined;
  themeSlug: string | undefined;
  difficulty: number | undefined;
  activeFilter: boolean | undefined;
  dimension: string | undefined;
  tagSearch: string | undefined;
};

export function SortSelect({
  currentSort,
  topicSlug,
  themeSlug,
  difficulty,
  activeFilter,
  dimension,
  tagSearch,
}: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as SortValue;
    const params = new URLSearchParams();
    if (topicSlug) params.set("topic", topicSlug);
    if (themeSlug) params.set("theme", themeSlug);
    if (difficulty !== undefined) params.set("difficulty", String(difficulty));
    if (activeFilter === true) params.set("active", "true");
    else if (activeFilter === false) params.set("active", "false");
    else if (activeFilter === undefined) params.set("active", "all");
    if (dimension) params.set("dimension", dimension);
    if (tagSearch) params.set("tag", tagSearch);
    if (value) params.set("sort", value);
    const qs = params.toString();
    router.push(qs ? `/admin/questions?${qs}` : "/admin/questions");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label htmlFor="sort-select" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
        Sort:
      </label>
      <select
        id="sort-select"
        value={currentSort}
        onChange={handleChange}
        style={{
          fontSize: "0.9rem",
          padding: "0.35rem 0.5rem",
          borderRadius: "var(--radius, 4px)",
          border: "1px solid var(--border, #ddd)",
          minWidth: "12rem",
        }}
      >
        <option value="">Default</option>
        <option value="times_asked_asc">Times asked (low first)</option>
        <option value="times_asked_desc">Times asked (high first)</option>
        <option value="created_at_asc">Created (oldest first)</option>
        <option value="created_at_desc">Created (newest first)</option>
        <option value="avg_score_asc">Avg score (low first)</option>
        <option value="avg_score_desc">Avg score (high first)</option>
        <option value="avg_rating_asc">Avg rating (low first)</option>
        <option value="avg_rating_desc">Avg rating (high first)</option>
      </select>
    </div>
  );
}
