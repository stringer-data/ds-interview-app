# Past Attempts in Scorecard + “What You’ve Learned” (Teaching Summary)

**Goal:** The scorecard is a **teaching** moment first: an LLM-generated summary that explains what the learner has been learning and reinforces concepts. Then they **dive into** the full list of past attempts to review specific questions and answers. This lives on the scorecard page (`/app/scorecard`).

**Flow:** 1) **Teach** — Show “What you’ve learned” (LLM summary). 2) **Dive in** — Below that, “All past attempts” so they can open any question and see their answer + context. **In practice too:** Show the same teaching summary again every few questions (e.g. every 3–5) during a session, so they get the reinforcement without having to leave the practice flow.

---

## 1. What to show

### A. All past attempts (in scorecard)

- **Source:** All attempts from `Attempt` for the current user: `questionText`, `answer`, `score`, `maxScore`, `topic`, `theme`, `loggedAt`. Ordered by `loggedAt` descending (newest first).
- **Placement:** On the **scorecard page** (`/app/scorecard`), as a dedicated section (e.g. below the topic × level breakdown table).
- **Ways to present:**
  - **Table:** Columns e.g. Date, Topic, Theme, Score, (optional) Question snippet. Row expand or “View” to see full question + your answer. Paginate (e.g. 20 per page) or “Load more” so the page stays usable.
  - **List / timeline:** Same data as a vertical list (newest first): date → topic · theme → score — expand for full Q&A. Pagination or infinite scroll.
- **Why all attempts:** Users can scroll back through their full history to see progression over time and ensure they’re improving.

### B. “What you’ve learned” — teaching summary (Option 2: LLM)

**Chosen approach:** Use an **LLM summary** as the main teaching moment. We don’t store grader feedback per attempt, but we have `questionText`, `answer`, `score`, `topic`, `theme` for each attempt — enough for the model to synthesize what they’ve been learning and teach it back.

- **Input:** Last K attempts (e.g. 10–20) with `questionText`, `answer`, `score`, `topic`, `theme`.
- **Prompt direction:** Ask the model to act as a **teacher** reviewing the learner’s work:
  - Name the **concepts** they’ve been practicing (e.g. “You’ve been building intuition for confounders and A/B test design”).
  - Reflect back what they’re **getting right** (e.g. “Your answers show you’re comfortable with …”).
  - Gently point to **gaps or next steps** (e.g. “Worth reinforcing: …” or “Next, try to connect …”).
  - One **concrete tip or takeaway** they can use in the next session.
  - Tone: encouraging, clear, educational — not just “you did 5 questions.”
- **Caching:** Cache per user (e.g. keyed by last N attempt ids + `updatedAt`). Regenerate when they submit a new answer (or on next scorecard load after a new attempt). Optionally cap frequency (e.g. at most one summary per 5 new attempts).
- **Placement — scorecard:** This summary is the **first** thing in the “progress” area on the scorecard — above the topic × level table and above “All past attempts,” so the flow is: read what you’ve learned → then dive into the questions below.
- **Placement — every few questions (in practice):** Show the same “What you’ve learned” summary again **during practice** every N questions (e.g. every 3 or 5 submissions). After they submit an answer, if their total attempts count is divisible by N (or they’ve done N since last summary), show the summary in a card or modal before the next question (e.g. “Here’s what you’ve been learning” with a “Continue” or “Next question” button). Reuse the cached summary from the API so we don’t call the LLM extra; just re-display it. This keeps the teaching moment in the flow so they don’t have to go to the scorecard to see it. Optionally: only show in-practice summary when the summary has changed since they last saw it (e.g. cache “last shown summary id” per session).

---

## 2. Where it goes: scorecard page (teach first, then dive in)

- **Current scorecard page (`/app/scorecard`):** Title, topic × level breakdown table, “Back to practice” link.
- **Proposed order (top to bottom):**
  1. **Page title** + short intro.
  2. **“What you’ve learned”** — LLM teaching summary (see §1B). Prominent card or block. This is the **teaching** moment: they read what they’ve been learning and get a tip before diving in.
  3. **Topic × level breakdown table** (existing).
  4. **“All past attempts” / “Dive into your questions”** — Section title that invites them to open specific attempts. Paginated table or list (date, topic, theme, score); row expand or “View” for full question + their answer. So after reading the summary, they can drill into any question and review.

If the user has no attempts yet: no summary; show “No attempts yet. Start practicing — we’ll summarize what you’re learning once you’ve answered some questions,” and link to practice.

### In practice: show summary every few questions

- On the **practice page** (`/app`), after the user submits an answer and sees feedback, check whether they’ve hit a “summary interval” (e.g. every 3 or 5 questions in this session, or every 3–5 questions overall since last show).
- If yes: before loading the next question, show the **same** “What you’ve learned” summary (fetch from `GET /api/scorecard/summary` or use a summary returned from submit-answer when we have one). Display it in a card or light modal with a “Continue” / “Next question” button so they can read and then proceed.
- Reuse the cached summary so no extra LLM call. Optionally show only when the summary has been regenerated since they last saw it (e.g. track “last summary id” or “last shown at attempt count” in session state).

---

## 3. API shape

- **New endpoint (suggested):** `GET /api/scorecard/attempts?limit=20&offset=0` (or `?page=1&perPage=20`).
- **Returns:**
  - `attempts`: array of `{ id, questionText, answer, topic, theme, score, maxScore, loggedAt }` for the requested page, ordered by `loggedAt` descending. Optionally truncate `questionText`/`answer` in the list response; full text when requesting a single attempt (e.g. `GET /api/scorecard/attempts/[id]`) or include full and let the client truncate.
  - `total`: total count of attempts (for pagination UI).
- **Auth:** Same as scorecard (current user only).
- **Teaching summary:** Either `GET /api/scorecard/summary` (returns `{ summary: string, generatedAt?: string }`) or include `learnedSummary` (+ optional `summaryGeneratedAt`) in an expanded scorecard response. Summary is generated by LLM from recent attempts; cache and invalidate as in §1B.

---

## 4. Implementation steps (easy to validate)

Do these in order. Each step is a single deliverable you can implement and verify before moving on.

| Step | What to do | Validate by |
|------|------------|-------------|
| **4.1** | **API: Paginated attempts.** Add `GET /api/scorecard/attempts?limit=20&offset=0`. Return `{ attempts: [...], total: number }` for current user, ordered by `loggedAt` desc. Fields: `id`, `questionText`, `answer`, `topic`, `theme`, `score`, `maxScore`, `loggedAt`. | Logged-in: response has `attempts` and `total`. Unauthenticated: 401. Change `offset`/`limit`: different page of results. |
| **4.2** | **UI: Scorecard — attempts list only.** On `/app/scorecard`, add section "All past attempts" below the breakdown table. Fetch from the new API. Show table or list: date, topic, theme, score (no expand yet). Pagination or "Load more" (e.g. 20 per page). | Visit `/app/scorecard`: list appears. User with no attempts: empty state. Pagination: second page loads correctly. |
| **4.3** | **UI: Scorecard — expand row for full Q&A.** Add row expand or "View" per attempt. On expand: show full `questionText` and `answer`. | Click expand/View: full question and answer visible. Collapse works. Long text doesn't break layout. |
| **4.4** | **API: Teaching summary.** Add `GET /api/scorecard/summary`. Load last K attempts (e.g. 10–20) for current user. If cache valid (keyed by user + attempt ids or count), return cached `{ summary, generatedAt }`. Else: call LLM with teaching prompt (§5), store result, return it. Invalidate cache when user submits a new answer. No attempts: return 200 with `{ summary: null }` or empty. | With attempts: get a non-empty summary. No attempts: null/empty, no LLM call. Two calls with same data: second is cache hit. After new answer, next call can regenerate. |
| **4.5** | **UI: Scorecard — summary block at top.** Fetch summary API on scorecard load. Show "What you've learned" as the **first** content block after the title — above breakdown and above "All past attempts". Loading state while fetching. No attempts: "Answer some questions and we'll summarize what you're learning" + link to practice. | Summary block first, then breakdown, then attempts. No attempts: friendly empty message. Loading state shows then disappears. |
| **4.6** | **UI: Practice — summary every N questions.** On `/app`, after submit and feedback: if total attempt count is multiple of N (e.g. N=3), before next question show teaching summary (fetch summary API). Card or modal with "Continue"; on click, dismiss and load next question. | After 3rd, 6th, 9th answer: summary appears; Continue → next question. After 1st, 2nd, 4th, 5th: no summary, normal flow. |
| **4.7** | **Polish.** Empty states (no attempts, no summary). Loading states for summary and attempts. Optional: "Regenerate summary" button. | No crashes with 0 attempts. Loading where async. Regenerate (if present) refreshes summary. |

**Dependency order:** 4.1 → 4.2 → 4.3 (attempts). 4.4 → 4.5 (summary API then scorecard UI). 4.5 can be before or after 4.2/4.3. 4.6 depends on 4.4. 4.7 anytime.

---

## 5. Prompt / copy direction for the teaching summary

- **Role:** “You are reviewing this learner’s practice to teach them what they’ve been learning. Be specific and encouraging.”
- **Include:** (1) Name the concepts they’ve been practicing. (2) What they’re getting right. (3) One gap or next step. (4) One concrete tip for next time.
- **Example tone:** “You’ve been building intuition for confounders and A/B test design. Your answers show you’re comfortable with framing null and alternative hypotheses; worth reinforcing how to choose metrics and guard against selection bias. Next time you see an experiment question, try stating the metric and the confound in one sentence before diving into the math.”
- **Avoid:** Generic praise (“Great job!”), listing question counts without interpretation, or overwhelming length (aim for 3–5 sentences).

---

## 6. Edge cases

- **No attempts:** Show empty state and CTA to answer the first question (no summary).
- **Very long question/answer:** Truncate in list view; full text on expand or in a modal.
- **Privacy:** Recent answers are only for the current user; no sharing. If you ever add “share progress,” make it opt-in and aggregated only.

---

## Summary

- **Teach first:** The scorecard leads with an LLM “What you’ve learned” summary that **teaches** — names concepts, reflects what they’re getting right, points to next steps, gives one concrete tip. Cached per user; regenerated when they add attempts.
- **Then dive in:** Below that, “All past attempts” (paginated) so they can open any question and see full Q&A. Flow: read the teaching summary → dive into the questions.
- **Every few questions:** Show the same teaching summary again during practice every N questions (e.g. 3 or 5) — card or modal after feedback, “Continue” to next question. Reuse cached summary; no extra LLM call. Keeps the teaching moment in the flow.
- **Placement:** On `/app/scorecard`: summary at top, then topic × level table, then full attempt history. On `/app`: summary surfaces every few questions. Scorecard is the place to **learn from** what they’ve done and drill into details.
