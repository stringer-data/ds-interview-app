Question system redesign (markdown notes)
Goals
Handle a few thousand questions.
Curate questions: edit, remove, change difficulty/topic.
Let users rate questions, add insights/discussion.
Drill into specific questions and see stats.
See coverage & gaps (what’s never asked, what’s weak).
Long term: maybe add semantic / RAG-style search, but keep a structured source of truth.

Implemented (current state)
- **Source of truth:** Questions live in the DB (Prisma); YAML import script seeds/updates. App reads from DB via `lib/questions.ts` and direct Prisma in APIs.
- **Admin list:** `/admin/questions` — table of active questions (ID, slug, topic, theme, difficulty, active) with links to detail by numeric `id`.
- **Admin detail/edit:** `/admin/questions/[id]` — single section that is either read-only (view) or the edit form (same area). No duplicated content above the form.
  - **View mode:** One read-only block: topic, theme, difficulty (human-readable label), active, question text, reference answer, category, tags. "Edit question" button.
  - **Edit mode:** Same section becomes the form. Fields: question text, reference answer, **category** (dropdown from shared constant `QUESTION_CATEGORIES`), **tags** (comma-separated; normalized on save: trim → spaces to hyphens e.g. "gen ai" → "gen-ai" → lowercase, dedupe, sort), **difficulty** (dropdown with labels: Definition, Intuition, Applied product, Technical / Assumptions, Hard case; stores 1–5), active checkbox. Save persists via PATCH `/api/admin/questions/[id]`; Cancel restores read-only view.
- **Difficulty labels (single source of truth):** `lib/question-admin.ts` — 1 = Definition, 2 = Intuition, 3 = Applied product, 4 = Technical / Assumptions, 5 = Hard case. Used for display and for the difficulty dropdown.
- **Category:** Shared constant `QUESTION_CATEGORIES` in `lib/question-admin.ts` (e.g. Causal Inference, Case Study, Experiment Design, Metrics, Gen AI, Statistics, Product Sense, Other). Dropdown uses it; legacy values not in the list are still shown/saved when present.
- **Tags normalization:** `normalizeTags()` in `lib/question-admin.ts`; applied in the PATCH API before save. Rule: trim → replace spaces with hyphen → lowercase → dedupe → sort (e.g. "Gen AI" → "gen-ai").
- **Regression tests:** Admin question detail page (view + not-found/invalid-id); QuestionEditForm (view/edit/Cancel, category and difficulty dropdowns, save body); API (PATCH category/tags/difficulty, tags normalization).

Decisions / constraints
- Use a **numeric `id` (autoincrement)** as the primary key on `questions`.
- Keep a **string `slug` / code** (e.g. `design_itt_01`) that is **unique and stable** for humans and for external references.
- **Topics and themes** should be **enforced** (e.g. enums / lookup tables) so typos don’t silently create new topics, but can be updated centrally in the future.
- Difficulty is conceptually in **5 ordered steps** (Definition → Intuition → Applied Product → Technical/Assumptions → Hard Case). Implemented as numeric `difficultyLevel` (1–5) with human-readable labels in `lib/question-admin.ts` (Definition, Intuition, Applied product, Technical / Assumptions, Hard case) so we can sort and re-label later.
- Question **rating is optional** for users; they can skip rating after an attempt.
- Use a **separate `question_ratings` table** so a question can receive **multiple ratings over time** (across versions / edits), and quality can be tracked as the question evolves.
- No dedicated **practice set** feature for now; practice flows remain topic/difficulty based or single-question drill-in.
- Admin **create and edit** flows should **reuse the same form** (one component for both).
- For “related questions”:
  - Start with **plain text search** on `question` + `tags`.
  - Later, add an **embeddings-based similar-questions** sidebar using a RAG-style layer, but keep the DB as the source of truth and use RAG only for discovery.

Source of truth: database instead of YAML
Keep YAML for now as a seed/back-up, but move the live question bank into the DB.

Core tables

questions table
- id (string, keep existing IDs e.g. design_itt_01) (do we want a numeric id too?)
- topic (e.g. Experimentation)
- theme (e.g. A/B Fundamentals)
- difficulty_level (numeric 1–5 in DB; labels in app). Levels: 1 = Definition, 2 = Intuition, 3 = Applied Product, 4 = Technical/Assumptions, 5 = Hard Case. Stored as integer; labels live in `lib/question-admin.ts` (single source of truth for UI).
- question (text)
- reference_answer (text, nullable)
- category (string, nullable). Admin UI uses a dropdown from shared constant `QUESTION_CATEGORIES`; DB accepts any string so legacy values are preserved.
- tags (array of strings). Stored normalized: trim, spaces→hyphen (e.g. "gen ai"→"gen-ai"), lowercase, dedupe, sort. Normalization applied in API on save.
- archived (bool; soft delete instead of hard delete)
- created_at, updated_at
- Existing attempts / Attempt

question_revisions
- id, question_id
- editor_user_id
- old_value / new_value (jsonb diff or full snapshot)
- created_at
Lets you see how questions changed over time and revert if needed.


question_ratings
- question_id
- user_id
- rating (e.g. 1–5)
- created_at
- Use to compute avg rating, “most/least helpful” questions.
For question ratings, I need to be able input when the question is asked.


user questions ui (new url)
- list of all questions with filters, topic, theme, difficulty_level,
- see the number of times asked (include if 0)
- see number of times asked and average score
- click on a question and show it on the question asking page



Admin UI for questions
Move away from editing YAML by hand; build an /admin/questions UI. 
- Create, read, update, and delete questions 
- add new question (on top if only if admin)

List view: /admin/questions
Filters:
- topic, theme, difficulty, dimension
- active vs archived
- Tag search (contains "itt" etc.)

Sorts:
- created_at (newest/oldest)
- times_asked
- avg_score
- avg_rating

Columns:
- id
- topic
- theme
- difficulty
- times_asked (from attempts)
- avg_score (0–4)
- avg_rating (from question_ratings)
- flags_count

Detail view: /admin/questions/[id]

Main (implemented):
- Single section: view mode shows all read-only (topic, theme, difficulty label, active, question text, reference answer, category, tags). Edit mode replaces that section with the form (no duplicated content).
- Category: dropdown from `QUESTION_CATEGORIES`. Difficulty: dropdown with labels (Definition … Hard case), stores 1–5. Tags: comma-separated input; API normalizes on save (spaces→hyphen, lowercase, dedupe, sort).
- Toggle active via edit form.

Planned / not yet built:
- Stats: times_asked, score distribution (e.g. bar chart 0–4), last asked date.
- Feedback: ratings summary + latest comments, open flags with reasons.
- Edit topic/theme (currently fixed per question).
- Revision history (if question_revisions is implemented).


5. Coverage & gaps reporting
With questions in the DB + attempts, you can build useful views.
- + button to add a new question with a dropdown for topic, theme, difficulty_level, text boxes for answer and refrence
- search related questions to tag to this question
- edit questions same as create

Already captures: user_id, question_id, score, logged_at, topic
Use this for usage + performance stats.
Optional history


question_flags (add a way to input flags to the question ui) It needs to collect the following data
- id
- question_id
- user_id
- reason (enum: unclear, wrong, too_easy, too_hard, etc.)
- notes (text)
- status (open, resolved, ignored)
- created_at, resolved_at, resolved_by
Lets you queue content issues for review.


User insights & discussion
Instead of squeezing insights into YAML, make them first-class.
question_comments / question_insights
id
question_id
user_id
body (markdown/text)
created_at
is_official (bool) — distinguish your curated notes from general discussion
Optional: parent_comment_id for threads, upvotes/downvotes.
Use cases:

Users share alternate approaches or mnemonics.
You add curated explanations or hints and pin them.
In the UI: show “Insights” tab under each question.

Never asked questions

SELECT * FROM questions q LEFT JOIN attempts a ON q.id = a.question_id WHERE a.question_id IS NULL AND q.active = TRUE
Use this to surface fresh questions into practice.
Weak questions

Low avg score (e.g. < 2.0) but asked many times.
May indicate: too hard, unclear, or mislabeled difficulty.
Weak areas

Aggregate attempts by topic and difficulty.
Show heatmap like current scorecard but for question coverage as well.

Practice selection with DB instead of YAML
Port the current selection logic (selectNextQuestion) from:

File-based: loadBankAndMaps → filter by topic → choose next.
To:

DB-based: query questions with filters, join with attempts as needed.
Possible flow:

Fetch candidate questions:
By topic filter, difficulty bands, active only.
Use attempts to:
Compute which are never asked.
Identify retry pool (low scores).
Apply same selection heuristic as now:
Prefer never-asked in weak topics, else retry hard ones, etc.
7. RAG / semantic layer (optional, later)
Once this is stable, you can layer RAG on top:

Keep questions as source of truth.
Build an question_embeddings table:
question_id
embedding vector (for question + reference answer + top insights).
Use it for:
“Find similar questions” under each question.
“Search questions related to ITT and clustered samples.”
But do not replace the DB selection logic with free-form LLM; use RAG just for discovery/assistive search.


Migration from YAML
- One-time script:
- Parse all YAML files.
- Insert into questions table with the same IDs and metadata.

After migration:
- Make the app read from DB.

Keep YAML As a backup/export.

If you want, next step can be: a concrete Prisma schema snippet for these tables, or a wireframe-style description of the /admin/questions pages.

---

Implementation status (summary)

Done
- **Schema:** Question (numeric id, slug, topic/theme FKs, difficultyLevel 1–5, difficultyStep, dimension, question, referenceAnswer, category, tags, active), Topic, Theme. QuestionRevision, QuestionRating, QuestionFlag, QuestionComment models and enums exist in Prisma.
- **Source of truth:** App reads questions from DB (`lib/questions.ts`, next-question API). YAML import script (`scripts/import-questions-from-yaml.mjs`) seeds/updates DB.
- **Practice selection:** `selectNextQuestion` and next-question API use DB; topic filter works.
- **Admin list:** `/admin/questions` — table with id, slug, topic, theme, difficulty, active; links to detail by numeric id. No filters/sorts/extra columns yet.
- **Admin detail/edit:** `/admin/questions/[id]` — single view/edit section; category dropdown, difficulty dropdown (labels), tags (normalized on save); PATCH API; tests.
- **Shared constants:** `lib/question-admin.ts` (difficulty labels, QUESTION_CATEGORIES, normalizeTags).

Partial / schema only (no UI or API yet)
- **question_revisions:** Table exists; no “view revision history” or write path in admin.
- **question_ratings:** Table exists; no “rate this question” after attempt or display on detail.
- **question_flags:** Table exists; no UI to create or list flags on question detail.
- **question_comments:** Table exists; no “Insights” tab or comment UI.

Not started
- **Admin list:** Filters (topic, theme, difficulty, dimension, active, tag search), sorts (created_at, times_asked, avg_score, avg_rating), columns: times_asked, avg_score, avg_rating, flags_count.
- **Admin:** Create new question (button + form), Delete/archive question.
- **Detail:** Stats (times_asked, score distribution, last asked), Feedback (ratings summary, comments, flags), Edit topic/theme, Revision history.
- **User questions UI:** New URL for users to list questions with filters, see times asked / avg score, click to open on practice page.
- **Coverage & gaps:** Never-asked query, Weak questions, Weak areas / heatmap.
- **RAG / semantic layer:** question_embeddings, similar-questions discovery.
- **Attempts:** Still keyed by `questionId` (string/slug); no FK to Question.id yet, so times_asked per question would need to be computed by slug or after a migration.

