import { describe, expect, it } from "vitest";
import { parseGradeResponseText } from "@/lib/grader";

describe("parseGradeResponseText", () => {
  it("keeps Example answers when all 0-4 levels are present", () => {
    const text = `Score: 3
Verdict: Solid
What was good: Correct core idea.
Missing / wrong: Needs more depth.
Example answers:
0. Off-topic
1. Very weak
2. Partial
3. Mostly right
4. Interview ready
Follow-up question: —`;
    const result = parseGradeResponseText(text);
    expect(result.exampleAnswers).toContain("0. Off-topic");
    expect(result.exampleAnswers).toContain("4. Interview ready");
  });

  it("normalizes Example answers to 0-4 when model returns a single unnumbered line", () => {
    const text = `Score: 2
Verdict: Basic
What was good: Mentions a metric.
Missing / wrong: Needs methods.
Example answers: Mention engagement metric and segments.
Follow-up question: Which experiment would you run?`;
    const result = parseGradeResponseText(text);
    expect(result.exampleAnswers).toContain('0. "I am not sure, and I do not have an answer to this question."');
    expect(result.exampleAnswers).toContain("2. Mention engagement metric and segments.");
    expect(result.exampleAnswers).toContain("4. \"I would start by defining the primary engagement metric, baseline, and guardrails.");
  });
});
