import OpenAI from "openai";

const RUBRIC = `Grade answers strictly on **conceptual understanding**. Ignore typos, spelling, and grammar.
When a question has a reference_answer, compare the candidate's answer to it and score by how well they cover the same key points (concepts, not wording).

Rubric:
4 = interview ready
3 = mostly correct
2 = partial
1 = weak
0 = incorrect

Return exactly this format (plain text):
Score: <0-4>
Verdict: <one short line>
What was good: <bullet or short para>
Missing / wrong: <conceptual gaps only; do not list typos or grammar>
Example answers: (give example answers for each level: weak, partial, mostly correct, interview ready)
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
    exampleAnswers: (exampleMatch?.[1] ?? "").trim() || "—",
    followUpQuestion: (followUpMatch?.[1] ?? "").trim() || "—",
  };
}
