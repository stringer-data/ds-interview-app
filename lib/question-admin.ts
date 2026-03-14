/**
 * Shared constants and helpers for admin question editing.
 * Single source of truth for category options and difficulty labels.
 */

/** 1 = definition, 2 = intuition, 3 = applied product, 4 = technical/assumptions, 5 = hard case */
export const DIFFICULTY_LEVEL_OPTIONS = [
  { value: 1, label: "Definition" },
  { value: 2, label: "Intuition" },
  { value: 3, label: "Applied product" },
  { value: 4, label: "Technical / Assumptions" },
  { value: 5, label: "Hard case" },
] as const;

export function getDifficultyLabel(level: number): string {
  const option = DIFFICULTY_LEVEL_OPTIONS.find((o) => o.value === level);
  return option?.label ?? String(level);
}

/** Map difficulty level 1–5 to Prisma DifficultyStep enum for create/update */
export function difficultyLevelToStep(level: number): "STEP1_DEFINITION" | "STEP2_INTUITION" | "STEP3_APPLIED_PRODUCT" | "STEP4_TECHNICAL_ASSUMPTIONS" | "STEP5_HARD_CASE" {
  const n = Number(level) || 1;
  switch (n) {
    case 1: return "STEP1_DEFINITION";
    case 2: return "STEP2_INTUITION";
    case 3: return "STEP3_APPLIED_PRODUCT";
    case 4: return "STEP4_TECHNICAL_ASSUMPTIONS";
    case 5:
    default: return "STEP5_HARD_CASE";
  }
}

/** Category dropdown options. DB still stores string; this is the allowed set for the UI. */
export const QUESTION_CATEGORIES = [
  "Causal Inference",
  "Case Study",
  "Experiment Design",
  "Metrics",
  "Gen AI",
  "Statistics",
  "Product Sense",
  "Other",
] as const;

/**
 * Normalize tags for storage: trim, replace spaces with hyphen, lowercase, dedupe, sort.
 * e.g. ["Gen AI", "  experimentation  "] → ["experimentation", "gen-ai"]
 */
export function normalizeTags(tags: string[]): string[] {
  const normalized = tags
    .map((t) => t.trim().replace(/\s+/g, "-").toLowerCase())
    .filter(Boolean);
  return [...new Set(normalized)].sort();
}
