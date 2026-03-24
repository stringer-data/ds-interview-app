import { gradeAnswer } from "@/lib/grader";

export type EvalCase = {
  id: string;
  question: string;
  answer: string;
  expectedScore: number;
  referenceAnswer?: string;
  notes?: string;
};

export type EvalCaseResult = {
  id: string;
  question: string;
  answer: string;
  expectedScore: number;
  predictedScore: number;
  absoluteError: number;
  isExactMatch: boolean;
  isSevereMiss: boolean;
  verdict: string;
  whatWasGood: string;
  missingWrong: string;
  notes?: string;
};

export type EvalSummary = {
  count: number;
  meanAbsoluteError: number;
  exactMatchRate: number;
  underScoreRate: number;
  overScoreRate: number;
  severeMissRate: number;
};

export type EvalReport = {
  summary: EvalSummary;
  results: EvalCaseResult[];
};

export type GradeCandidate = (params: {
  question: string;
  answer: string;
  referenceAnswer?: string;
}) => Promise<{ score: number; verdict: string; whatWasGood: string; missingWrong: string }>;

function clampScore(score: number): number {
  return Math.min(4, Math.max(0, score));
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function evaluateGrader(
  evalCases: EvalCase[],
  grader: GradeCandidate = gradeAnswer
): Promise<EvalReport> {
  if (evalCases.length === 0) {
    return {
      summary: {
        count: 0,
        meanAbsoluteError: 0,
        exactMatchRate: 0,
        underScoreRate: 0,
        overScoreRate: 0,
        severeMissRate: 0,
      },
      results: [],
    };
  }

  const results: EvalCaseResult[] = [];
  for (const testCase of evalCases) {
    const graded = await grader({
      question: testCase.question,
      answer: testCase.answer,
      referenceAnswer: testCase.referenceAnswer,
    });

    const predictedScore = clampScore(graded.score);
    const expectedScore = clampScore(testCase.expectedScore);
    const absoluteError = Math.abs(predictedScore - expectedScore);

    results.push({
      id: testCase.id,
      question: testCase.question,
      answer: testCase.answer,
      expectedScore,
      predictedScore,
      absoluteError,
      isExactMatch: absoluteError === 0,
      isSevereMiss: absoluteError >= 2,
      verdict: graded.verdict,
      whatWasGood: graded.whatWasGood,
      missingWrong: graded.missingWrong,
      notes: testCase.notes,
    });
  }

  const count = results.length;
  const sumAbsError = results.reduce((sum, row) => sum + row.absoluteError, 0);
  const exactMatches = results.filter((row) => row.isExactMatch).length;
  const underScores = results.filter((row) => row.predictedScore < row.expectedScore).length;
  const overScores = results.filter((row) => row.predictedScore > row.expectedScore).length;
  const severeMisses = results.filter((row) => row.isSevereMiss).length;

  return {
    summary: {
      count,
      meanAbsoluteError: round(sumAbsError / count),
      exactMatchRate: round(exactMatches / count),
      underScoreRate: round(underScores / count),
      overScoreRate: round(overScores / count),
      severeMissRate: round(severeMisses / count),
    },
    results,
  };
}

export function formatEvalReport(report: EvalReport): string {
  const lines: string[] = [];
  lines.push("=== Grader Evaluation Summary ===");
  lines.push(`Cases: ${report.summary.count}`);
  lines.push(`MAE: ${report.summary.meanAbsoluteError}`);
  lines.push(`Exact match rate: ${report.summary.exactMatchRate}`);
  lines.push(`Under-score rate: ${report.summary.underScoreRate}`);
  lines.push(`Over-score rate: ${report.summary.overScoreRate}`);
  lines.push(`Severe miss rate (|error| >= 2): ${report.summary.severeMissRate}`);
  lines.push("");
  lines.push("=== Per-case Results ===");

  for (const row of report.results) {
    lines.push(`[${row.id}] expected=${row.expectedScore} predicted=${row.predictedScore} absError=${row.absoluteError}`);
    lines.push(`Q: ${row.question}`);
    lines.push(`A: ${row.answer}`);
    if (row.notes) {
      lines.push(`Notes: ${row.notes}`);
    }
    lines.push(`Verdict: ${row.verdict || "—"}`);
    lines.push(`What was good: ${row.whatWasGood || "—"}`);
    lines.push(`Missing/wrong: ${row.missingWrong || "—"}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
