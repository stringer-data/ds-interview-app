# Insights Feature — Implementation Plan & Summary

## A. Implementation Plan

1. **Backend**
   - **GET /api/insights** (auth): Load current user's attempts; if count < 5 return empty payload; else build history summary, run RAG for related questions (by weak-area embedding), call LLM for structured insights, return JSON.
   - **GET /api/question?slug=** (auth): Return a single question by slug in the same shape as next-question so the practice page can load a specific question from Insights.

2. **RAG**
   - Reuse existing embeddings + pgvector. Add `getRelatedQuestionsByText(seedText, excludeSlugs, k)` that embeds the seed (e.g. weak topics + sample question text), runs similarity search, excludes already-answered slugs, returns candidate questions with slug, question text, topic, level.

3. **LLM**
   - Single prompt: user history summary + candidate question list. Response must be strict JSON (summary, strengths, improvement_areas, patterns, next_steps, recommended_questions). Recommended question_ids are validated against the candidate list only.

4. **Frontend**
   - New page **/app/insights** with empty state (< 5 attempts) and full view (summary, strengths, improvement areas, patterns, next steps, recommended questions with "Practice this question" → /app?question=slug).
   - Add "Insights" to app nav. Practice page supports `?question=slug` to load that question via GET /api/question.

5. **Guardrails**
   - No admin-only data. Malformed LLM response → fallback minimal insight. Recommendations only from RAG-backed candidates. Thin history → empty state, no hallucinated strengths/weaknesses.

---

## B. Data Flow / Architecture

```
User opens /app/insights
    → GET /api/insights
    → getCurrentUser(); load attempts (last 100)
    → if attempts.length < 5 → return { hasEnoughData: false, attemptCount, minAttempts: 5 }
    → buildHistorySummary(attempts)
    → weakestTopics(attempts) + sample low-score question texts
    → buildWeakAreaSeedText(weakTopics, samples) → seedText
    → getRelatedQuestionsByText(seedText, answeredSlugs, 15)  [RAG: embed seed, pgvector NN, exclude answered]
    → candidates = relatedRows mapped to { slug, question, topic, level }
    → generateInsights(historySummary, candidates)  [OpenAI, structured JSON]
    → parseInsightsResponse(text, allowedSlugs)  [validate, filter recommended_questions to allowed slugs]
    → return { hasEnoughData: true, attemptCount, insights }
    → UI renders summary, strengths, improvement areas, patterns, next steps, recommended questions
    → "Practice this question" → /app?question=slug → GET /api/question?slug= → set question on practice page
```

---

## C. Files Created or Modified

| Action | Path |
|--------|------|
| Create | `lib/insights-types.ts` — types and JSON schema for insights payload and LLM response |
| Create | `lib/insights-rag.ts` — getRelatedQuestionsByText, buildWeakAreaSeedText |
| Create | `lib/insights-llm.ts` — buildHistorySummary, buildInsightsPrompt, parseInsightsResponse, generateInsights |
| Create | `app/api/insights/route.ts` — GET handler |
| Create | `app/api/question/route.ts` — GET ?slug= handler |
| Create | `app/app/insights/page.tsx` — Insights page (empty state + full UI) |
| Create | `app/api/insights/route.test.ts` |
| Create | `app/api/question/route.test.ts` |
| Create | `lib/insights-llm.test.ts` |
| Modify | `app/app/layout.tsx` — add "Insights" nav link |
| Modify | `app/app/page.tsx` — support ?question=slug, fetch /api/question when slug present |

---

## D. Prompt Template (LLM)

**System:**  
"You are a supportive data science interview coach. Given a user's practice history (questions answered, scores, topics, difficulty), produce a structured JSON insight. Be specific and evidence-based. Do not overclaim; if the data is thin, say so in the summary. Recommend only from the candidate questions provided; do not invent question IDs."

**User:**  
- "## User practice history" + `buildHistorySummary(attempts)`  
- "## Candidate questions you MAY recommend (pick 3-5; use exactly these slugs as question_id)" + list of `slug | topic | level | question`  
- JSON schema and rules: summary, strengths[], improvement_areas[], patterns[], next_steps[], recommended_questions[]; each question_id must be from the candidate list.

---

## E. JSON Schema for LLM Response

```json
{
  "summary": "string (2-4 sentences, evidence-based)",
  "strengths": [
    { "topic": "string", "reason": "string", "evidence": "string" }
  ],
  "improvement_areas": [
    { "topic": "string", "issue": "string", "evidence": "string", "recommendation": "string" }
  ],
  "patterns": [
    { "pattern": "string", "explanation": "string" }
  ],
  "next_steps": ["string", ...],
  "recommended_questions": [
    { "question_id": "string (slug)", "question_text": "string", "why_recommended": "string", "topic": "string", "level": number }
  ]
}
```

---

## F. Implementation Notes

- **MIN_ATTEMPTS** = 5 for unlocking insights.
- **Recommendations**: Sourced only from RAG (pgvector similarity to weak-area text). Already-answered slugs are excluded. LLM selects 3–5 from the candidate list and adds `why_recommended`.
- **Fallback**: If `generateInsights` returns null (e.g. missing API key or parse failure), the API returns a minimal insight object with a short message and no recommendations.
- **Practice deep link**: `/app?question=<slug>` loads that question via GET /api/question and sets it as the current question.

---

## G. Migrations / API Updates

- **No DB migrations.** Uses existing `Attempt`, `Question`, `QuestionEmbedding`, `Topic` (and related).
- **New APIs only**: GET /api/insights, GET /api/question.

---

## H. Tests

- **GET /api/insights**: 401 when not logged in; hasEnoughData false when attempts < 5; hasEnoughData true and insights when ≥ 5 (mocked prisma + LLM).
- **GET /api/question**: 401, 400 (missing slug), 404 (not found), 200 with correct shape.
- **lib/insights-llm**: buildHistorySummary (content and empty case), parseInsightsResponse (valid JSON, code fence, invalid JSON, slug filtering), buildInsightsPrompt (includes history and candidates).

---

## I. Summary of What Was Built

- **Insights page** at `/app/insights`: user-facing, coach-style view that answers “What am I good at?”, “What am I missing?”, “What should I work on next?”, “Which questions should I do now?”
- **Empty state**: Shown when the user has fewer than 5 attempts; explains that insights unlock after more practice and offers a “Continue practice” CTA.
- **Full state**: Personalized summary, strengths (with evidence), improvement areas (with recommendations), common patterns, next steps, and 3–5 recommended questions. Each recommendation has a “Practice this question” button that deep-links to the practice page with that question loaded.
- **Backend**: GET /api/insights aggregates attempt history, uses RAG (embeddings + pgvector) to find questions related to weak areas, and uses an LLM to produce structured insights. GET /api/question returns a single question by slug for deep-linking.
- **Guardrails**: No admin data; recommendations only from real RAG candidates; malformed LLM output handled with a minimal fallback; thin history does not produce overstated insights.
