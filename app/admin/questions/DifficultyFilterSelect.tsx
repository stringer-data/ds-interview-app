"use client";

import { useRouter } from "next/navigation";
import { DIFFICULTY_LEVEL_OPTIONS } from "@/lib/question-admin";
import type { SortValue } from "./SortSelect";

type Props = {
  currentDifficulty: number | undefined;
  topicSlug: string | undefined;
  sort: SortValue;
  activeFilter: boolean | undefined;
};

export function DifficultyFilterSelect({
  currentDifficulty,
  topicSlug,
  sort,
  activeFilter,
}: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams();
    if (topicSlug) params.set("topic", topicSlug);
    if (sort) params.set("sort", sort);
    if (activeFilter === true) params.set("active", "true");
    else if (activeFilter === false) params.set("active", "false");
    else if (activeFilter === undefined) params.set("active", "all");
    if (value) params.set("difficulty", value);
    const qs = params.toString();
    router.push(qs ? `/admin/questions?${qs}` : "/admin/questions");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label htmlFor="difficulty-filter" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
        Difficulty:
      </label>
      <select
        id="difficulty-filter"
        value={currentDifficulty ?? ""}
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
        {DIFFICULTY_LEVEL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
