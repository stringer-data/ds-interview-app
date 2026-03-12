/** All topics shown on scorecard and in topic-filtered practice */
export const ALL_TOPICS = ["Causal", "Machine Learning", "Experimentation", "Metrics", "Gen AI"] as const;

export function topicToSlug(topic: string): string {
  const map: Record<string, string> = {
    Causal: "causal",
    "Machine Learning": "machine-learning",
    Experimentation: "experimentation",
    Metrics: "metrics",
    "Gen AI": "gen-ai",
  };
  return map[topic] ?? topic.toLowerCase().replace(/\s+/g, "-");
}

export function topicFromSlug(slug: string): string | null {
  const map: Record<string, string> = {
    causal: "Causal",
    "machine-learning": "Machine Learning",
    experimentation: "Experimentation",
    metrics: "Metrics",
    "gen-ai": "Gen AI",
  };
  return map[slug] ?? null;
}
