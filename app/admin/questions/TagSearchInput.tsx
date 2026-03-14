"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import type { SortValue } from "./SortSelect";

type Props = {
  currentTag: string | undefined;
  topicSlug: string | undefined;
  themeSlug: string | undefined;
  sort: SortValue;
  difficulty: number | undefined;
  activeFilter: boolean | undefined;
  dimension: string | undefined;
};

function buildParams(
  tag: string,
  topicSlug: string | undefined,
  themeSlug: string | undefined,
  sort: SortValue,
  difficulty: number | undefined,
  activeFilter: boolean | undefined,
  dimension: string | undefined
): URLSearchParams {
  const params = new URLSearchParams();
  if (topicSlug) params.set("topic", topicSlug);
  if (themeSlug) params.set("theme", themeSlug);
  if (sort) params.set("sort", sort);
  if (difficulty !== undefined) params.set("difficulty", String(difficulty));
  if (activeFilter === true) params.set("active", "true");
  else if (activeFilter === false) params.set("active", "false");
  else if (activeFilter === undefined) params.set("active", "all");
  if (dimension) params.set("dimension", dimension);
  if (tag.trim()) params.set("tag", tag.trim());
  return params;
}

export function TagSearchInput({
  currentTag,
  topicSlug,
  themeSlug,
  sort,
  difficulty,
  activeFilter,
  dimension,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = inputRef.current?.value ?? "";
    const params = buildParams(value, topicSlug, themeSlug, sort, difficulty, activeFilter, dimension);
    const qs = params.toString();
    router.push(qs ? `/admin/questions?${qs}` : "/admin/questions");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label htmlFor="tag-search" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
        Tag:
      </label>
      <input
        ref={inputRef}
        id="tag-search"
        type="text"
        name="tag"
        defaultValue={currentTag ?? ""}
        placeholder="e.g. gen-ai"
        style={{
          fontSize: "0.9rem",
          padding: "0.35rem 0.5rem",
          borderRadius: "var(--radius, 4px)",
          border: "1px solid var(--border, #ddd)",
          minWidth: "8rem",
        }}
      />
      <button type="submit" className="btn btn-ghost" style={{ padding: "0.35rem 0.5rem", fontSize: "0.9rem" }}>
        Filter
      </button>
    </form>
  );
}
