import { describe, it, expect } from "vitest";
import {
  buildHistorySummary,
  parseInsightsResponse,
  buildInsightsPrompt,
} from "./insights-llm";
import type { AttemptForInsights, RAGCandidateQuestion } from "./insights-types";

describe("buildHistorySummary", () => {
  it("includes total attempts and date range", () => {
    const attempts: AttemptForInsights[] = [
      {
        questionId: "q1",
        followUpId: null,
        topic: "Causal",
        theme: "T1",
        difficulty: 1,
        score: 3,
        maxScore: 4,
        questionText: "What is causality?",
        answer: "A",
        loggedAt: new Date("2025-01-01"),
      },
      {
        questionId: "q2",
        followUpId: null,
        topic: "Causal",
        theme: "T1",
        difficulty: 2,
        score: 2,
        maxScore: 4,
        questionText: "Explain confounders.",
        answer: "B",
        loggedAt: new Date("2025-01-05"),
      },
    ];
    const summary = buildHistorySummary(attempts);
    expect(summary).toContain("Total attempts: 2");
    expect(summary).toContain("Causal");
  });

  it("handles empty attempts", () => {
    const summary = buildHistorySummary([]);
    expect(summary).toContain("Total attempts: 0");
  });
});

describe("parseInsightsResponse", () => {
  const allowedSlugs = new Set(["slug_a", "slug_b"]);

  it("parses valid JSON and filters recommended_questions by allowed slugs", () => {
    const text = JSON.stringify({
      summary: "Good progress.",
      strengths: [{ topic: "Causal", reason: "R", evidence: "E" }],
      improvement_areas: [],
      patterns: [],
      next_steps: ["Practice more."],
      recommended_questions: [
        { question_id: "slug_a", question_text: "Q?", why_recommended: "Weak area.", topic: "Causal", level: 1 },
        { question_id: "slug_b", question_text: "Q2", why_recommended: "Good next.", topic: "ML", level: 2 },
        { question_id: "invalid_slug", question_text: "Q3", why_recommended: "Nope", topic: "X", level: 1 },
      ],
    });
    const result = parseInsightsResponse(text, allowedSlugs);
    expect(result).not.toBeNull();
    expect(result!.summary).toBe("Good progress.");
    expect(result!.recommended_questions).toHaveLength(2);
    expect(result!.recommended_questions.map((r) => r.question_id)).toEqual(["slug_a", "slug_b"]);
  });

  it("strips markdown code fence and parses", () => {
    const json = JSON.stringify({
      summary: "Ok",
      strengths: [],
      improvement_areas: [],
      patterns: [],
      next_steps: [],
      recommended_questions: [],
    });
    const result = parseInsightsResponse("```json\n" + json + "\n```", allowedSlugs);
    expect(result).not.toBeNull();
    expect(result!.summary).toBe("Ok");
  });

  it("returns null for invalid JSON", () => {
    expect(parseInsightsResponse("not json", allowedSlugs)).toBeNull();
    expect(parseInsightsResponse("", allowedSlugs)).toBeNull();
  });

  it("parses improvement_areas with focus_areas and recommended_question_slugs", () => {
    const text = JSON.stringify({
      summary: "Ok",
      strengths: [],
      improvement_areas: [
        {
          topic: "Causal",
          issue: "Low scores.",
          evidence: "0.35 avg.",
          recommendation: "Focus on foundations.",
          focus_areas: ["confounders", "treatment effects"],
          recommended_question_slugs: ["slug_a", "slug_b", "invalid_slug"],
        },
      ],
      patterns: [],
      next_steps: [],
      recommended_questions: [],
    });
    const result = parseInsightsResponse(text, allowedSlugs);
    expect(result).not.toBeNull();
    expect(result!.improvement_areas).toHaveLength(1);
    expect(result!.improvement_areas[0].focus_areas).toEqual(["confounders", "treatment effects"]);
    expect(result!.improvement_areas[0].recommended_question_slugs).toEqual(["slug_a", "slug_b"]);
  });
});

describe("buildInsightsPrompt", () => {
  it("includes history and candidate list", () => {
    const history = "Total attempts: 3\n- Causal: 0.75";
    const candidates: RAGCandidateQuestion[] = [
      { slug: "s1", question: "Q1?", topic: "Causal", level: 1 },
    ];
    const { system, user } = buildInsightsPrompt(history, candidates);
    expect(system).toContain("interview coach");
    expect(user).toContain("User practice history");
    expect(user).toContain(history);
    expect(user).toContain("s1");
    expect(user).toContain("Q1?");
  });
});
