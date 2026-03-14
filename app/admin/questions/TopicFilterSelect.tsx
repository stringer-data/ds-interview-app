"use client";

import { useRouter } from "next/navigation";
import { ALL_TOPICS, topicToSlug } from "@/lib/topics";

type Props = {
  currentTopicSlug: string | undefined;
};

export function TopicFilterSelect({ currentTopicSlug }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === "") {
      router.push("/admin/questions");
    } else {
      router.push(`/admin/questions?topic=${encodeURIComponent(value)}`);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label htmlFor="topic-filter" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
        Topic:
      </label>
      <select
        id="topic-filter"
        value={currentTopicSlug ?? ""}
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
        {ALL_TOPICS.map((topicName) => (
          <option key={topicToSlug(topicName)} value={topicToSlug(topicName)}>
            {topicName}
          </option>
        ))}
      </select>
    </div>
  );
}
