import { describe, it, expect } from "vitest";
import { normalizeTags, getDifficultyLabel, difficultyLevelToStep, DIFFICULTY_LEVEL_OPTIONS, QUESTION_CATEGORIES } from "./question-admin";

describe("normalizeTags", () => {
  it("trims, replaces spaces with hyphens, lowercases, dedupes, and sorts", () => {
    expect(normalizeTags(["Gen AI", "  experimentation  "])).toEqual(["experimentation", "gen-ai"]);
  });

  it("deduplicates and sorts", () => {
    expect(normalizeTags(["tag2", "tag1", "tag1"])).toEqual(["tag1", "tag2"]);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeTags([])).toEqual([]);
  });

  it("filters out empty strings after trim", () => {
    expect(normalizeTags(["  ", "a", ""])).toEqual(["a"]);
  });
});

describe("getDifficultyLabel", () => {
  it("returns label for levels 1–5", () => {
    expect(getDifficultyLabel(1)).toBe("Definition");
    expect(getDifficultyLabel(2)).toBe("Intuition");
    expect(getDifficultyLabel(3)).toBe("Applied product");
    expect(getDifficultyLabel(4)).toBe("Technical / Assumptions");
    expect(getDifficultyLabel(5)).toBe("Hard case");
  });

  it("returns string of number for unknown level", () => {
    expect(getDifficultyLabel(0)).toBe("0");
    expect(getDifficultyLabel(6)).toBe("6");
  });
});

describe("difficultyLevelToStep", () => {
  it("maps 1–5 to Prisma DifficultyStep enum", () => {
    expect(difficultyLevelToStep(1)).toBe("STEP1_DEFINITION");
    expect(difficultyLevelToStep(2)).toBe("STEP2_INTUITION");
    expect(difficultyLevelToStep(3)).toBe("STEP3_APPLIED_PRODUCT");
    expect(difficultyLevelToStep(4)).toBe("STEP4_TECHNICAL_ASSUMPTIONS");
    expect(difficultyLevelToStep(5)).toBe("STEP5_HARD_CASE");
  });
});

describe("constants", () => {
  it("DIFFICULTY_LEVEL_OPTIONS has 5 entries", () => {
    expect(DIFFICULTY_LEVEL_OPTIONS).toHaveLength(5);
    expect(DIFFICULTY_LEVEL_OPTIONS.map((o) => o.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it("QUESTION_CATEGORIES includes expected options", () => {
    expect(QUESTION_CATEGORIES).toContain("Causal Inference");
    expect(QUESTION_CATEGORIES).toContain("Gen AI");
  });
});
