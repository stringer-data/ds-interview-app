import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateGrader, formatEvalReport, type EvalCase, type GradeCandidate } from "@/lib/grader-eval";

function loadGraderEvalFixtures(): EvalCase[] {
  const fixturePath = path.resolve(process.cwd(), "scripts/grader-eval-fixtures.json");
  const raw = readFileSync(fixturePath, "utf8");
  return JSON.parse(raw) as EvalCase[];
}

describe("grader eval framework", () => {
  it("computes calibration metrics for expected vs predicted scores", async () => {
    const evalCases: EvalCase[] = [
      {
        id: "sd-formula",
        question: "What is standard deviation?",
        answer: "sqrt(sum((xi - mean(x))^2)) / n",
        expectedScore: 4,
      },
      {
        id: "stratified-definition",
        question: "What is a stratified sample?",
        answer: "A sampling method that samples a population by strata like age or gender.",
        expectedScore: 3,
      },
      {
        id: "incorrect",
        question: "What is p-value?",
        answer: "It is always the probability the null is true.",
        expectedScore: 1,
      },
    ];

    const fakeGrader: GradeCandidate = async ({ question }) => {
      if (question.includes("standard deviation")) {
        return {
          score: 2,
          verdict: "Too low",
          whatWasGood: "Formula attempt",
          missingWrong: "Harsh rubric",
        };
      }
      if (question.includes("stratified")) {
        return {
          score: 2,
          verdict: "Bit low",
          whatWasGood: "Mentions strata",
          missingWrong: "Missing proportional sampling",
        };
      }
      return {
        score: 1,
        verdict: "Incorrect",
        whatWasGood: "—",
        missingWrong: "Wrong concept",
      };
    };

    const report = await evaluateGrader(evalCases, fakeGrader);

    expect(report.summary.count).toBe(3);
    expect(report.summary.meanAbsoluteError).toBe(1);
    expect(report.summary.exactMatchRate).toBe(0.333);
    expect(report.summary.underScoreRate).toBe(0.667);
    expect(report.summary.overScoreRate).toBe(0);
    expect(report.summary.severeMissRate).toBe(0.333);
    expect(report.results[0]).toMatchObject({
      id: "sd-formula",
      expectedScore: 4,
      predictedScore: 2,
      absoluteError: 2,
      isSevereMiss: true,
    });
  });

  it("formats report text for terminal review", async () => {
    const evalCases: EvalCase[] = [
      {
        id: "stratified-definition",
        question: "What is a stratified sample?",
        answer: "Split population into strata and sample each group.",
        expectedScore: 3,
      },
    ];
    const report = await evaluateGrader(evalCases, async () => ({
      score: 3,
      verdict: "Mostly correct",
      whatWasGood: "Core concept right",
      missingWrong: "Could add proportional detail",
    }));

    const text = formatEvalReport(report);
    expect(text).toContain("Grader Evaluation Summary");
    expect(text).toContain("stratified-definition");
    expect(text).toContain("expected=3 predicted=3");
  });

  it("includes North Star metric barometer case at expected 3/4", () => {
    const cases = loadGraderEvalFixtures();
    const northStar = cases.find((c) => c.id === "north-star-metric-definition");
    expect(northStar).toBeDefined();
    expect(northStar?.expectedScore).toBe(3);
    expect(northStar?.question).toMatch(/North Star/i);
    expect(northStar?.answer).toMatch(/guardrails|inputs/i);
  });

  it("includes OLS squared vs absolute errors barometer case at expected 4/4", () => {
    const cases = loadGraderEvalFixtures();
    const ols = cases.find((c) => c.id === "ols-squared-vs-absolute-errors");
    expect(ols).toBeDefined();
    expect(ols?.expectedScore).toBe(4);
    expect(ols?.question).toMatch(/OLS|squared/i);
    expect(ols?.answer).toMatch(/Gaussian|maximum likelihood|normal equations|L1/i);
  });
});
