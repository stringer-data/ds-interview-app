"use client";

import { useRouter } from "next/navigation";
import type { SortValue } from "./SortSelect";

const DIMENSION_OPTIONS = [
  { value: "STRATEGY", label: "Strategy" },
  { value: "INTERPRETATION", label: "Interpretation" },
  { value: "MATH", label: "Math" },
] as const;

type Props = {
  currentDimension: string | undefined;
  topicSlug: string | undefined;
  themeSlug: string | undefined;
  sort: SortValue;
  difficulty: number | undefined;
  activeFilter: boolean | undefined;
};

export function DimensionFilterSelect({
  currentDimension,
  topicSlug,
  themeSlug,
  sort,
  difficulty,
  activeFilter,
}: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams();
    if (topicSlug) params.set("topic", topicSlug);
    if (themeSlug) params.set("theme", themeSlug);
    if (sort) params.set("sort", sort);
    if (difficulty !== undefined) params.set("difficulty", String(difficulty));
    if (activeFilter === true) params.set("active", "true");
    else if (activeFilter === false) params.set("active", "false");
    else if (activeFilter === undefined) params.set("active", "all");
    if (value) params.set("dimension", value);
    const qs = params.toString();
    router.push(qs ? `/admin/questions?${qs}` : "/admin/questions");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label htmlFor="dimension-filter" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
        Dimension:
      </label>
      <select
        id="dimension-filter"
        value={currentDimension ?? ""}
        onChange={handleChange}
        style={{
          fontSize: "0.9rem",
          padding: "0.35rem 0.5rem",
          borderRadius: "var(--radius, 4px)",
          border: "1px solid var(--border, #ddd)",
          minWidth: "10rem",
        }}
      >
        <option value="">All</option>
        {DIMENSION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
