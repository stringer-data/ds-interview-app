import { describe, it, expect } from "vitest";
import { ALL_TOPICS, topicToSlug, topicFromSlug } from "./topics";

describe("lib/topics", () => {
  it("ALL_TOPICS is exactly the five allowed topics in order (matches scorecard)", () => {
    expect(ALL_TOPICS).toEqual([
      "Causal",
      "Machine Learning",
      "Experimentation",
      "Metrics",
      "Gen AI",
    ]);
  });

  it("topicToSlug and topicFromSlug round-trip for all allowed topics", () => {
    for (const topic of ALL_TOPICS) {
      const slug = topicToSlug(topic);
      expect(topicFromSlug(slug)).toBe(topic);
    }
  });
});
