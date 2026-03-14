"use client";

import { useRouter } from "next/navigation";
import type { SortValue } from "./SortSelect";

type ThemeOption = { slug: string; name: string };

type Props = {
  themes: ThemeOption[];
  currentThemeSlug: string | undefined;
  topicSlug: string | undefined;
  sort: SortValue;
  difficulty: number | undefined;
  activeFilter: boolean | undefined;
  dimension: string | undefined;
};

export function ThemeFilterSelect({
  themes,
  currentThemeSlug,
  topicSlug,
  sort,
  difficulty,
  activeFilter,
  dimension,
}: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams();
    if (topicSlug) params.set("topic", topicSlug);
    if (sort) params.set("sort", sort);
    if (difficulty !== undefined) params.set("difficulty", String(difficulty));
    if (activeFilter === true) params.set("active", "true");
    else if (activeFilter === false) params.set("active", "false");
    else if (activeFilter === undefined) params.set("active", "all");
    if (dimension) params.set("dimension", dimension);
    if (value) params.set("theme", value);
    const qs = params.toString();
    router.push(qs ? `/admin/questions?${qs}` : "/admin/questions");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label htmlFor="theme-filter" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
        Theme:
      </label>
      <select
        id="theme-filter"
        value={currentThemeSlug ?? ""}
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
        {themes.map((t) => (
          <option key={t.slug} value={t.slug}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
