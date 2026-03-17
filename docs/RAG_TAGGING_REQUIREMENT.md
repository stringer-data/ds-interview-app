
# RAG / Tagging Requirement

Design a RAG-based architecture to review and tag all questions. Purpose: improve related-question recommendations, metadata quality, and searchability on both the admin and user side. The system should also produce suggestions (e.g. tag suggestions, metadata improvements, potential duplicates) for review.

Propose a practical architecture that is incremental and not overly complex.

---

# Goals

- **Related-question recommendations** — Suggest “similar” or “related” questions when viewing a question or after feedback (admin and user).
- **Metadata quality** — Improve tags, category, difficulty, and other fields using embeddings and model suggestions.
- **Searchability** — Support semantic (and optionally keyword) search over questions in admin and in a future user question browser.
- **Suggestions** — Surfaces suggestions for: tags to add, category/difficulty to reconsider, possible duplicate or near-duplicate questions, and wording improvements. All suggestions are for human review (admin); no auto-apply.

---

# Data Flow (High Level)

1. **Source of truth** — Questions live in Postgres (existing `Question` model: slug, topic, theme, difficulty, question text, reference answer, category, tags, etc.).
2. **Indexing pipeline** — When a question is created/updated (or on a full sync), generate embeddings and optional tag/suggestion payloads; write to embedding store and optionally a suggestions table.
3. **Embedding store** — Holds vectors (and question id/slug) for similarity search. Updated by the pipeline; read by related-questions and search.
4. **Suggestions store** — Holds suggested tags, category, duplicates, etc., keyed by question; admin UI reads and can accept/dismiss.
5. **Retrieval** — Related questions: embed the current question (or its text), query embedding store, return top-k. Search: embed query (and/or keyword match), return ranked list.
6. **Review** — Admin sees suggestions per question (or in a “review suggestions” list); can apply, edit, or dismiss. Applied changes write back to Postgres and can trigger re-indexing.

---

# Embedding and Tagging Strategy

- **What to embed**
  - **Primary:** Concatenation of question text + reference answer (and optionally category/tags as text). One vector per question for similarity and related-questions.
  - **Optional:** Separate vector for “question only” if you want related-by-question vs related-by-full-content.
- **Model** — Use a single small, fast model (e.g. OpenAI `text-embedding-3-small`, or an open-source equivalent) for all question embeddings. Same model for indexing and for query embedding at retrieval time.
- **Tagging and suggestions (incremental)**
  - **Phase 1:** No automatic tag generation; RAG only for similarity (related questions + optional search). Reduces risk and complexity.
  - **Phase 2:** Add a “suggestions” step: for each question (or batch), call an LLM with question text + reference answer + current tags/category. Prompt: “Suggest tags, category, difficulty, and list any potential duplicate question slugs from this bank.” Store results in a `QuestionSuggestion` (or similar) table for admin review. No auto-apply.
  - **Phase 3 (optional):** Lightweight auto-tagging from embeddings (e.g. cluster questions, suggest cluster labels as tags) still with admin review before apply.

---

# Storage Approach

- **Embeddings**
  - **Option A (simplest):** Use Postgres with pgvector. Add an `question_embeddings` table: `questionId`, `embedding` (vector), `modelVersion`, `updatedAt`. Keeps everything in one DB; good for &lt; ~10k questions.
  - **Option B:** Dedicated vector DB (e.g. Pinecone, Weaviate, Qdrant) if you expect large scale or need advanced filtering. Sync question id/slug and embedding from your pipeline.
- **Suggestions**
  - Store in Postgres: e.g. `QuestionSuggestion` with `questionId`, `suggestedTags[]`, `suggestedCategory`, `suggestedDifficulty`, `duplicateCandidateSlugs[]`, `freeformSuggestions` (text), `status` (pending / accepted / dismissed), `createdAt`, `reviewedAt`. One row per question (or per “run”) so admin can review and clear.
- **Question text**
  - Remain in existing `Question` table. Embeddings and suggestions reference `questionId` (or slug). No duplication of full text in the vector DB unless you use Option B and want a copy there for display.

---

# How Tags and Suggestions Are Generated and Reviewed

- **Generation**
  - **Embeddings:** On question create/update (or cron over modified questions), build input text (question + reference answer), call embedding API, upsert into embedding store. Optionally run a nightly “full sync” for consistency.
  - **Suggestions:** Separate job (cron or on-demand). For each question (or batch), call LLM with: question text, reference answer, current tags/category/difficulty, and optionally a list of other question slugs. Ask for: suggested tags, suggested category, suggested difficulty, possible duplicates (by slug), and short freeform improvement notes. Write to `QuestionSuggestion` with status `pending`.
- **Review**
  - Admin UI: on question detail (or a dedicated “Suggestions” view), show pending suggestions for that question. Actions: “Apply” (write to `Question` and clear or mark suggestion accepted), “Edit then apply,” “Dismiss.” Applied changes trigger re-embed and optionally clear suggestion row.
  - No automatic application of tags or metadata; all changes go through admin review.

---

# How Related Questions Are Retrieved

- **At request time (e.g. “Related questions” on detail page or after feedback)**
  1. Take the current question (or the question the user just answered). Build the same input string used for indexing (e.g. question text + reference answer).
  2. Embed that string with the same model used for indexing.
  3. Query the embedding store: nearest-neighbor search (e.g. cosine or inner product) for top-k (e.g. 5–10), excluding the current question id.
  4. Return list of question ids/slugs; resolve to full questions from Postgres (topic, theme, title/slug, difficulty) and show in UI.
- **Optional filters**
  - Restrict to same topic, or same topic + theme, before or after vector search (filter by topicId/themeId in Postgres or in the vector DB if it supports metadata filters).
- **Caching**
  - Cache “related questions” per question id (e.g. in memory or Redis) with a short TTL or invalidate on question update to keep results fresh without recomputing every time.

---

# Incremental Rollout

1. **Phase 1 — Embeddings only**
   - Add `question_embeddings` (or use existing table with pgvector). Pipeline: on question create/update, embed and upsert. API + UI: “Related questions” on admin question detail (and optionally on user-facing question view) using k-NN. No LLM suggestions yet.
2. **Phase 2 — Suggestions**
   - Add `QuestionSuggestion` (or equivalent) and a job that runs LLM to suggest tags, category, difficulty, duplicates. Admin UI to review and apply/dismiss. No auto-apply.
3. **Phase 3 — Search**
   - Add search endpoint (admin and/or user): embed query, search embedding store, return ranked questions. Optional: combine with keyword match on title/tags.
4. **Phase 4 (optional)** — Richer suggestions (e.g. wording improvements), or move to a dedicated vector DB if scale demands it.

---

# Summary

- **Data flow:** Postgres = source of truth → indexing pipeline → embedding store + suggestions table → retrieval and admin review.
- **Embedding strategy:** One vector per question (question + reference answer); one small embedding model; same for index and query.
- **Storage:** pgvector in Postgres for simplicity and incremental adoption; optional vector DB later.
- **Tags/suggestions:** Generated by LLM in a separate job; stored for admin; applied only after human review.
- **Related questions:** Embed current question, k-NN in embedding store, optional topic/theme filter, return top-k; optional caching.
- **Practical and incremental:** Start with related-questions only, then add suggestions and search, without overbuilding.

---

# How to Utilize This RAG

## Once it’s built — how you use it

**As admin**

- **Related questions** — On a question’s detail page, open a “Related questions” block. Use it to: link to similar questions, build “practice sets,” or spot near-duplicates.
- **Suggestions** — In admin, open “Suggestions” (or the suggestions section on each question). Review suggested tags, category, difficulty, and duplicate candidates. Apply what’s good, edit or dismiss the rest. Run the suggestion job periodically (e.g. weekly) to refresh.
- **Search** — In admin (and later in a user question browser), use semantic search: type a concept or phrase, get back questions that match by meaning, not just keywords. Use it to find questions to edit, to curate lists, or to answer “do we have something on X?”.

**As a user (practice flow)**

- **Related questions** — After feedback, show “Practice a related question” (and optionally “Next question” or “Harder”). User picks one; you use RAG to fetch similar questions so they can deepen practice on the same theme or move on.
- **Search (if you add a question browser)** — User searches by topic or concept; RAG returns semantically relevant questions so they can choose what to practice.

**As a content steward**

- Use **suggestions** to keep metadata consistent (tags, category, difficulty) and to merge or fix near-duplicates. Use **related questions** to sanity-check that “similar” really are similar before linking them.

---

## How to get there — implementation path

To actually utilize the RAG, you need to build it in small steps. Below is a concrete path; each step gives you something you can use immediately.

**Step 1 — Embeddings in Postgres**

- Enable pgvector in your DB (extension + migration).
- Add a table, e.g. `question_embeddings` (questionId, embedding vector, modelVersion, updatedAt).
- Implement an indexing step: input = question text + reference answer; call OpenAI (or your chosen embedding API); insert/update row. Run this on every question create/update (e.g. in API or a small script), plus a one-off backfill over existing questions.
- You’re not “using” RAG in the UI yet, but you’re ready for the next step.

**Step 2 — Related questions (admin)**

- Add an API, e.g. `GET /api/admin/questions/:id/related?k=5`. It loads the question, builds the same input string, embeds it, runs k-NN against `question_embeddings` (excluding current id), returns question ids/slugs.
- On the admin question detail page, add a “Related questions” section that calls this API and links to those questions.
- **Utilize:** In admin, for any question, you can now click through to similar questions and use that for curation or duplicate checks.

**Step 3 — Related questions (user-facing, optional)**

- Add an API used by the app, e.g. `GET /api/related-questions?question_id=...&k=5` (or pass slug). Same logic as admin; optionally restrict to same topic or active-only.
- In the practice flow, after showing feedback, add a “Practice a related question” action that calls this API and then loads one of the returned questions (or let the user choose from the list).
- **Utilize:** Users get a clear “related” path instead of only “next random” or “next harder.”

**Step 4 — Suggestions (admin)**

- Add a `QuestionSuggestion` (or similar) table and a job (cron or script) that, for each question, calls an LLM with question + reference + current metadata and asks for: suggested tags, category, difficulty, duplicate slugs, short notes. Store results with status `pending`.
- On admin question detail (or a “Review suggestions” page), list pending suggestions and add actions: Apply, Edit then apply, Dismiss. On apply, update `Question` and optionally re-run the embedding step; then clear or mark the suggestion.
- **Utilize:** You periodically run the job, then in admin you review and apply suggestions to improve tags and metadata without doing it all by hand.

**Step 5 — Search**

- Add an API, e.g. `GET /api/admin/questions/search?q=...`. Embed the query string, run k-NN over `question_embeddings`, return ranked question ids; resolve in Postgres and return list.
- In the admin questions list (or a dedicated search bar), add a search box that calls this and shows results. Optionally combine with keyword filter on slug/tags.
- **Utilize:** You search by meaning (“causal inference,” “A/B test power”) and get relevant questions for editing or curation.

**Step 6 (optional) — User-facing search**

- If you add a user question browser, add a search endpoint (same embedding + k-NN, scoped to active questions) and a search UI so users can find questions by topic or concept.
- **Utilize:** Users discover what to practice via search instead of only filters or random draw.

---

## Minimal “first use” path

If you want to utilize RAG as soon as possible with the least code:

1. Add pgvector + `question_embeddings` and a backfill script that embeds all existing questions.
2. Add one API: related questions by question id (embed question + ref answer, k-NN, return top 5).
3. On admin question detail, add a “Related questions” block that calls that API and links to the returned questions.

After that, you’re actively using RAG for related-question recommendations in admin; then you can add suggestions and search when ready.
