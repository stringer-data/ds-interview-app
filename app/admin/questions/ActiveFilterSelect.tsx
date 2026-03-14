"use client";

import { useRouter } from "next/navigation";
import type { SortValue } from "./SortSelect";

type Props = {
  currentActive: boolean | undefined;
  topicSlug: string | undefined;
  sort: SortValue;
  difficulty: number | undefined;
};

/** active undefined = show all, true = active only, false = archived only */
export function ActiveFilterSelect({
  currentActive,
  topicSlug,
  sort,
  difficulty,
}: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams();
    if (topicSlug) params.set("topic", topicSlug);
    if (sort) params.set("sort", sort);
    if (difficulty !== undefined) params.set("difficulty", String(difficulty));
    if (value === "true") params.set("active", "true");
    else if (value === "false") params.set("active", "false");
    else if (value === "all") params.set("active", "all");
    const qs = params.toString();
    router.push(qs ? `/admin/questions?${qs}` : "/admin/questions");
  }

  const selectValue =
    currentActive === undefined ? "all" : currentActive ? "true" : "false";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label htmlFor="active-filter" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
        Status:
      </label>
      <select
        id="active-filter"
        value={selectValue}
        onChange={handleChange}
        style={{
          fontSize: "0.9rem",
          padding: "0.35rem 0.5rem",
          borderRadius: "var(--radius, 4px)",
          border: "1px solid var(--border, #ddd)",
          minWidth: "8rem",
        }}
      >
        <option value="all">All</option>
        <option value="true">Active</option>
        <option value="false">Archived</option>
      </select>
    </div>
  );
}
