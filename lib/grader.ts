import OpenAI from "openai";

const RUBRIC = `Grade answers strictly on **conceptual understanding**. Ignore typos, spelling, and grammar.
When a question has a reference_answer, compare the candidate's answer to it and score by how well they cover the same key points (concepts, not wording).

Rubric:
4 = interview ready (accurate, clear, and complete)
3 = conceptually right, missing nuance (core idea is correct; depth can improve)
2 = starts understanding the fundamentals (some correct ideas, but key parts missing or mixed)
1 = most basic concepts are covered (minimal signal; mostly vague or incorrect)
0 = no attempt or completely off-topic

Decision rules:
- If the core concept is correct, prefer 3 over 2.
- Use 2 only when understanding is partial or mixed.
- Use 1 only when understanding is very limited.
- Use 0 for blank or off-topic answers.
- Coverage-first learning goal: a 3 means "good enough to move on" rather than continue drilling.

Return exactly this format (plain text):
Score: <0-4>
Verdict: <one short line>
What was good: <bullet or short para>
Missing / wrong: <conceptual gaps only; do not list typos or grammar>
Example answers:
0. <candidate-style response; one sentence>
1. <candidate-style response; 1-2 sentences, very limited understanding>
2. <candidate-style response; 1-3 sentences, partial understanding>
3. <candidate-style response; 2-4 sentences, mostly correct but missing nuance>
4. <candidate-style response; 3-6 sentences, interview-ready>
Write these as actual candidate answers to THIS question, not rubric descriptions.
Follow-up question: <optional suggested follow-up or "—">`;

export type GradeResult = {
  score: number;
  maxScore: number;
  verdict: string;
  whatWasGood: string;
  missingWrong: string;
  exampleAnswers: string;
  followUpQuestion: string;
};

function normalizeExampleAnswers(raw: string): string {
  const text = raw.trim();
  const hasLevels = [0, 1, 2, 3, 4].every((level) =>
    new RegExp(`(^|\\n)\\s*${level}\\s*[\\).:-]`, "m").test(text)
  );
  if (hasLevels) return text;

  const fallbackByLevel: Record<number, string> = {
    0: `"I am not sure, and I do not have an answer to this question."`,
    1: `"I would look at the main metric and try to improve it, but I am not sure what method to use."`,
    2: `"I would first define the key metric, then review segments and drivers to see where changes might help, but I would need guidance on the exact analysis."`,
    3: `"I would define the primary engagement metric and break it down by segment, then identify likely drivers and test targeted changes. This is directionally right, but I have not fully specified guardrails or statistical checks."`,
    4: `"I would start by defining the primary engagement metric, baseline, and guardrails. Then I would segment users, form clear hypotheses about top drivers, and run a prioritized experiment plan with success criteria and monitoring. After each test, I would quantify impact, check trade-offs, and iterate based on the evidence."`,
  };

  if (!text || text === "—") {
    return [0, 1, 2, 3, 4].map((level) => `${level}. ${fallbackByLevel[level]}`).join("\n");
  }

  return [0, 1, 2, 3, 4]
    .map((level) => (level === 2 ? `${level}. ${text}` : `${level}. ${fallbackByLevel[level]}`))
    .join("\n");
}

export function parseGradeResponseText(text: string): GradeResult {
  const scoreMatch = text.match(/Score:\s*(\d+)/i);
  const score = Math.min(4, Math.max(0, scoreMatch ? parseInt(scoreMatch[1], 10) : 2));
  const verdictMatch = text.match(/Verdict:\s*([\s\S]+?)(?=\n|$)/i);
  const whatMatch = text.match(/What was good:\s*([\s\S]+?)(?=\nMissing|\nExample|$)/i);
  const missingMatch = text.match(/Missing \/ wrong:\s*([\s\S]+?)(?=\nExample|\nFollow-up|$)/i);
  const exampleMatch = text.match(/Example answers:?\s*([\s\S]+?)(?=\nFollow-up|$)/i);
  const followUpMatch = text.match(/Follow-up question:?\s*([\s\S]+?)$/i);
  return {
    score,
    maxScore: 4,
    verdict: (verdictMatch?.[1] ?? "").trim() || "—",
    whatWasGood: (whatMatch?.[1] ?? "").trim() || "—",
    missingWrong: (missingMatch?.[1] ?? "").trim() || "—",
    exampleAnswers: normalizeExampleAnswers((exampleMatch?.[1] ?? "").trim() || "—"),
    followUpQuestion: (followUpMatch?.[1] ?? "").trim() || "—",
  };
}

export async function gradeAnswer(params: {
  question: string;
  answer: string;
  referenceAnswer?: string;
}): Promise<GradeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      score: 2,
      maxScore: 4,
      verdict: "Grading unavailable (no API key).",
      whatWasGood: "—",
      missingWrong: "Set OPENAI_API_KEY to enable LLM grading.",
      exampleAnswers: "—",
      followUpQuestion: "—",
    };
  }
  const openai = new OpenAI({ apiKey });
  const refBlock = params.referenceAnswer
    ? `\nReference answer (use to align grading):\n${params.referenceAnswer}`
    : "";
  const prompt = `${RUBRIC}\n\nQuestion:\n${params.question}${refBlock}\n\nCandidate answer:\n${params.answer}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return parseGradeResponseText(text);
}
