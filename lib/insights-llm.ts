/**
 * Insights LLM: build history summary, prompt, and parse structured JSON response.
 */

import OpenAI from "openai";
import type {
  AttemptForInsights,
  InsightsLLMResponse,
  RAGCandidateQuestion,
} from "./insights-types";

const INSIGHTS_MODEL = "gpt-4o-mini";

/** Build a concise text summary of user history for the LLM */
export function buildHistorySummary(attempts: AttemptForInsights[]): string {
  const byTopic: Record<string, { score: number; max: number; samples: string[] }> = {};
  for (const a of attempts) {
    const t = a.topic || "Other";
    if (!byTopic[t]) byTopic[t] = { score: 0, max: 0, samples: [] };
    byTopic[t].score += a.score;
    byTopic[t].max += a.maxScore;
    if (a.questionText && byTopic[t].samples.length < 2) {
      byTopic[t].samples.push(a.questionText.slice(0, 200));
    }
  }

  const lines: string[] = [
    `Total attempts: ${attempts.length}`,
    `Date range: ${attempts.length > 0 ? attempts[attempts.length - 1].loggedAt.toISOString().slice(0, 10) : "—"} to ${attempts.length > 0 ? attempts[0].loggedAt.toISOString().slice(0, 10) : "—"}`,
    "",
    "By topic (topic | avg score / max | count):",
  ];

  for (const [topic, d] of Object.entries(byTopic)) {
    const avg = d.max ? (d.score / d.max).toFixed(2) : "0";
    const count = d.max / 4; // assume maxScore 4 per attempt
    lines.push(`- ${topic}: ${avg} (${Math.round(count)} attempts)`);
  }

  lines.push("", "Recent attempts (newest first, truncated):");
  for (const a of attempts.slice(0, 20)) {
    const q = (a.questionText || "—").slice(0, 150);
    lines.push(
      `- [${a.topic}] diff ${a.difficulty} | score ${a.score}/${a.maxScore} | ${a.loggedAt.toISOString().slice(0, 10)} | Q: ${q}${q.length >= 150 ? "…" : ""}`
    );
  }

  return lines.join("\n");
}

const JSON_SCHEMA = `
Respond with ONLY a single JSON object (no markdown, no code fence). Schema:
{
  "summary": "string (2-4 sentences: what the data shows about this user's strengths and gaps; be specific and evidence-based; if data is thin, say so)",
  "strengths": [
    { "topic": "string", "reason": "string", "evidence": "string (e.g. scores or examples from history)" }
  ],
  "improvement_areas": [
    {
      "topic": "string",
      "issue": "string",
      "evidence": "string",
      "recommendation": "string",
      "focus_areas": ["string", ...] (optional; 1-5 specific concepts/skills to work on within this topic, e.g. "confounders", "treatment effects", "sample size"),
      "recommended_question_slugs": ["slug1", "slug2", ...] (optional; 1-3 slugs from the candidate list below that target this gap)
    }
  ],
  "patterns": [
    { "pattern": "string", "explanation": "string" }
  ],
  "next_steps": ["string (short coaching bullet)", ...],
  "recommended_questions": [
    { "question_id": "string (MUST be one of the candidate slugs below)", "question_text": "string", "why_recommended": "string", "topic": "string", "level": number }
  ]
}
Rules: recommended_questions must be 5 items when possible (otherwise as many as make sense from the candidate list). Each question_id MUST be exactly one of the candidate question slugs provided. For each improvement_area, include focus_areas (specific sub-topics to improve) and recommended_question_slugs (up to 5 candidate slugs that address that area; prefer questions that match the focus_areas). Do not invent question slugs.`;

/** Build the system + user prompt for the insights LLM */
export function buildInsightsPrompt(
  historySummary: string,
  candidates: RAGCandidateQuestion[]
): { system: string; user: string } {
  const candidateList = candidates
    .map(
      (c) =>
        `- slug: ${c.slug} | topic: ${c.topic} | level: ${c.level} | question: ${c.question.slice(0, 300)}${c.question.length > 300 ? "…" : ""}`
    )
    .join("\n");

  return {
    system: `You are a supportive data science interview coach. Given a user's practice history (questions answered, scores, topics, difficulty), produce a structured JSON insight. Be specific and evidence-based. Do not overclaim; if the data is thin, say so in the summary. Recommend only from the candidate questions provided; do not invent question IDs.`,
    user: `## User practice history\n\n${historySummary}\n\n## Candidate questions you MAY recommend (pick 3-5; use exactly these slugs as question_id)\n\n${candidateList}\n\n${JSON_SCHEMA}`,
  };
}

/** Parse and validate LLM response; returns null if malformed */
export function parseInsightsResponse(
  text: string,
  allowedSlugs: Set<string>
): InsightsLLMResponse | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const o = parsed as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary : "";
  const strengths = Array.isArray(o.strengths)
    ? (o.strengths as unknown[]).filter(
        (s): s is { topic: string; reason: string; evidence: string } =>
          s != null &&
          typeof s === "object" &&
          typeof (s as any).topic === "string" &&
          typeof (s as any).reason === "string" &&
          typeof (s as any).evidence === "string"
      )
    : [];
  const rawImprovementAreas = Array.isArray(o.improvement_areas) ? (o.improvement_areas as unknown[]) : [];
  const improvement_areas = rawImprovementAreas
    .filter(
      (s): s is Record<string, unknown> =>
        s != null &&
        typeof s === "object" &&
        typeof (s as any).topic === "string" &&
        typeof (s as any).issue === "string" &&
        typeof (s as any).evidence === "string" &&
        typeof (s as any).recommendation === "string"
    )
    .map((s) => {
      const focus_areas = Array.isArray(s.focus_areas)
        ? (s.focus_areas as unknown[]).filter((f): f is string => typeof f === "string").slice(0, 8)
        : undefined;
      const recommended_question_slugs = Array.isArray(s.recommended_question_slugs)
        ? (s.recommended_question_slugs as unknown[])
            .filter((slug): slug is string => typeof slug === "string")
            .filter((slug) => allowedSlugs.has(slug))
            .slice(0, 8)
        : undefined;
      return {
        topic: (s as any).topic,
        issue: (s as any).issue,
        evidence: (s as any).evidence,
        recommendation: (s as any).recommendation,
        ...(focus_areas && focus_areas.length > 0 && { focus_areas }),
        ...(recommended_question_slugs && recommended_question_slugs.length > 0 && { recommended_question_slugs }),
      };
    });
  const patterns = Array.isArray(o.patterns)
    ? (o.patterns as unknown[]).filter(
        (p): p is { pattern: string; explanation: string } =>
          p != null &&
          typeof p === "object" &&
          typeof (p as any).pattern === "string" &&
          typeof (p as any).explanation === "string"
      )
    : [];
  const next_steps = Array.isArray(o.next_steps)
    ? (o.next_steps as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  let recommended_questions = Array.isArray(o.recommended_questions)
    ? (o.recommended_questions as unknown[]).filter(
        (r): r is { question_id: string; question_text: string; why_recommended: string; topic: string; level: number } =>
          r != null &&
          typeof r === "object" &&
          typeof (r as any).question_id === "string" &&
          typeof (r as any).question_text === "string" &&
          typeof (r as any).why_recommended === "string" &&
          typeof (r as any).topic === "string" &&
          typeof (r as any).level === "number"
      )
    : [];

  // Only keep recommended questions whose question_id is in allowed slugs
  recommended_questions = recommended_questions.filter((r) => allowedSlugs.has(r.question_id));

  return {
    summary,
    strengths,
    improvement_areas,
    patterns,
    next_steps,
    recommended_questions,
  };
}

/** Call OpenAI and return parsed insights or null */
export async function generateInsights(
  historySummary: string,
  candidates: RAGCandidateQuestion[]
): Promise<InsightsLLMResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const { system, user } = buildInsightsPrompt(historySummary, candidates);
  const completion = await openai.chat.completions.create({
    model: INSIGHTS_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.3,
  });
  const text = completion.choices[0]?.message?.content ?? "";
  const allowedSlugs = new Set(candidates.map((c) => c.slug));
  return parseInsightsResponse(text, allowedSlugs);
}
