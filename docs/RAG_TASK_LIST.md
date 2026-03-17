
# RAG Implementation Task List

Each task: **write the test first** → **make the item work** → **confirm passing** → **mark IN_REVIEW** and note where you should review.

Status: **TODO** | **IN_REVIEW** | **DONE**

---

**RAG implementation complete (Tasks 1–9).**

---

# Phase A — Schema and storage

| # | Task | Status |
|---|------|--------|
| 1 | Enable pgvector in Postgres (migration: `CREATE EXTENSION IF NOT EXISTS vector;`) | DONE |
| 2 | Add `QuestionEmbedding` model and table (Prisma + migration) | DONE |
| 3 | Helper `buildEmbeddingInputText(question, referenceAnswer)` + unit tests | DONE |

---

# Phase B — Embedding API and indexing

| # | Task | Status |
|---|------|--------|
| 4 | `getEmbedding(text)` — call OpenAI embeddings API, return `number[]` + unit tests (mock OpenAI) | DONE |
| 5 | `indexQuestionEmbedding(questionId)` — build text, embed, upsert + unit tests (mock Prisma + getEmbedding) | DONE |
| 6 | Backfill script for existing questions + optional test or manual verification | DONE |

---

# Phase C — Related questions (admin)

| # | Task | Status |
|---|------|--------|
| 7 | `GET /api/admin/questions/[id]/related?k=5` — return related slugs + API test | DONE |
| 8 | Admin question detail: “Related questions” section + page/component test | DONE |

---

# Phase D — Keep index in sync

| # | Task | Status |
|---|------|--------|
| 9 | Re-index on question create/update (POST/PATCH) + API test | DONE |

---

# Task details (for implementation)

## Task 1: Enable pgvector

- **Test first:** Optional: test that runs a raw SQL `SELECT 1::vector` (or migration runs without error). If no test, verification = migration runs.
- **Implement:** New Prisma migration with raw SQL `CREATE EXTENSION IF NOT EXISTS vector;`.
- **Confirm:** `npx prisma migrate dev` succeeds (and DB has vector type).
- **Ready for review:** Migration file in `prisma/migrations/`, and that migrate succeeds against your DB.

### Task 1 ready for review

- **Review:**  
  - `prisma/migrations/20250313120000_enable_pgvector/migration.sql` — should contain `CREATE EXTENSION IF NOT EXISTS vector;`  
  - `prisma/migrations/pgvector-migration.test.ts` — test that a migration exists and contains that SQL.
- **Confirm test:** Run `npm test -- prisma/migrations/pgvector-migration.test.ts` (should pass).
- **Apply the migration to your DB:** The migration file doesn’t change your database by itself. To actually enable pgvector you must run that SQL against your DB once:
  - **If you use Prisma migrations:** run `npx prisma migrate dev` (it will run the migration file).
  - **If you only use `db push`:** run the SQL yourself (e.g. in Neon SQL Editor, psql, or any DB client): `CREATE EXTENSION IF NOT EXISTS vector;`
  You’ll need this done before Task 2 (adding the `QuestionEmbedding` table that uses the `vector` type).
- When satisfied, mark Task 1 **DONE** in the table above.

---

## Task 2: QuestionEmbedding model and table

- **Test first:** Test that creates a `QuestionEmbedding` row (with a valid questionId and a placeholder vector if Prisma allows) and reads it back. May need to run after migration.
- **Implement:** Add model to `prisma/schema.prisma`; generate migration; run migrate.
- **Confirm:** Test passes; table exists in DB.
- **Ready for review:** `prisma/schema.prisma` (new model), `prisma/migrations/` (new migration), test file.

### Task 2 ready for review

- **Review:**
  - `prisma/schema.prisma` — `QuestionEmbedding` model with `questionId`, `embedding` (Unsupported vector(1536)), `modelVersion`, `updatedAt`; `Question` has `embeddings` relation.
  - `prisma/migrations/20250313130000_question_embedding/migration.sql` — creates `QuestionEmbedding` table with `vector(1536)` column, unique on `question_id`, FK to `Question`.
  - `prisma/question-embedding-migration.test.ts` — asserts schema has the model and a migration creates the table with vector.
- **Confirm test:** `npm test -- prisma/question-embedding-migration.test.ts` (should pass).
- **Apply migration:**  
  Ensure the **pgvector extension is enabled** before applying the question_embedding migration. Run once on your DB: `CREATE EXTENSION IF NOT EXISTS vector;` (Neon SQL Editor, psql, or any client).  
  If your DB was created with `db push` (no migration history), then:
  1. `npx prisma migrate resolve --applied 20250313100000_init`
  2. `npx prisma migrate resolve --applied 20250313120000_enable_pgvector` (only marks as applied; you must have run the SQL above so the extension actually exists)
  3. `npx prisma migrate dev` to apply `question_embedding`.
  If a migration fails with "type vector does not exist", run the extension SQL above, then `npx prisma migrate resolve --rolled-back 20250313130000_question_embedding`, then `npx prisma migrate dev` again.
- When satisfied, mark Task 2 **DONE** in the table above.

---

## Task 3: buildEmbeddingInputText

- **Test first:** `lib/embedding-input.test.ts` — (1) question only, (2) question + reference, (3) null reference → question only, (4) empty string reference. Assert output is string, trimmed, no undefined.
- **Implement:** `lib/embedding-input.ts` with `buildEmbeddingInputText(question: string, referenceAnswer: string | null): string`.
- **Confirm:** `npm test -- lib/embedding-input.test.ts` passes.
- **Ready for review:** `lib/embedding-input.ts`, `lib/embedding-input.test.ts`.

### Task 3 ready for review

- **Review:**
  - `lib/embedding-input.ts` — `buildEmbeddingInputText(question: string, referenceAnswer: string | null): string`; question-only when reference is null/empty, otherwise question + `\n\n` + reference; output trimmed.
  - `lib/embedding-input.test.ts` — (1) null reference → question only, (2) question + reference, (3) empty string reference → question only, (4) trimmed output.
- **Confirm test:** `npm test -- lib/embedding-input.test.ts` (should pass).
- When satisfied, mark Task 3 **DONE** in the table above.

---

## Task 4: getEmbedding (OpenAI)

- **Test first:** `lib/embeddings.test.ts` — mock OpenAI embeddings response; assert `getEmbedding("hello")` returns array of length 1536; assert throws when API throws or key missing.
- **Implement:** `lib/embeddings.ts` with `getEmbedding(text: string): Promise<number[]>` using `text-embedding-3-small`.
- **Confirm:** `npm test -- lib/embeddings.test.ts` passes.
- **Ready for review:** `lib/embeddings.ts`, `lib/embeddings.test.ts`.

### Task 4 ready for review

- **Review:**
  - `lib/embeddings.ts` — `getEmbedding(text: string): Promise<number[]>`; uses OpenAI `text-embedding-3-small`, throws when OPENAI_API_KEY missing/empty or API fails; returns plain number[] (1536).
  - `lib/embeddings.test.ts` — mocks OpenAI; asserts 1536-length array, throws on missing/empty key, throws when API throws.
- **Confirm test:** `npm test -- lib/embeddings.test.ts` (should pass).
- When satisfied, mark Task 4 **DONE** in the table above.

---

## Task 5: indexQuestionEmbedding

- **Test first:** Test that mocks Prisma (question findUnique) and getEmbedding; calls `indexQuestionEmbedding(1)`; asserts one upsert to QuestionEmbedding with questionId 1 and the mocked vector.
- **Implement:** `indexQuestionEmbedding(questionId)` in `lib/embeddings.ts` or `lib/embedding-index.ts` — load question, build input, getEmbedding, upsert.
- **Confirm:** Test passes.
- **Ready for review:** Implementation file, test file.

### Task 5 ready for review

- **Review:**
  - `lib/embedding-index.ts` — `indexQuestionEmbedding(questionId: number)` loads the `Question` row, builds input text, calls `getEmbedding`, and upserts into `QuestionEmbedding` with `modelVersion = "text-embedding-3-small"`.
  - `lib/embedding-index.test.ts` — mocks Prisma + embedding helpers; asserts upsert is called with the embedding and throws when question missing.
- **Confirm test:** `npm test -- lib/embedding-index.test.ts` (should pass).
- When satisfied, mark Task 5 **DONE** in the table above.

---

## Task 6: Backfill script

- **Test first:** Optional test: with 1 question in DB, run backfill, assert 1 row in question_embeddings. Or skip test and verify manually.
- **Implement:** `scripts/backfill-question-embeddings.mjs` (or .ts) — load all question ids, call indexQuestionEmbedding for each (with optional delay).
- **Confirm:** Script runs; table has rows (or test passes).
- **Ready for review:** `scripts/backfill-question-embeddings.mjs`, and instructions to run it.

### Task 6 ready for review

- **Review:**
  - `lib/embedding-index.ts` — `backfillQuestionEmbeddings(options?: { delayMs?: number })` loads all question ids, calls `indexQuestionEmbedding` for each, returns `{ total, ok, failed }`; logs and counts failures.
  - `lib/embedding-index.test.ts` — `backfillQuestionEmbeddings` test: mocks `findMany` returning two ids, asserts two upserts and result counts.
  - `scripts/backfill-question-embeddings.ts` — loads `dotenv/config`, calls `backfillQuestionEmbeddings({ delayMs: env.DELAY_MS })`, logs result, exits 1 if any failed.
  - `package.json` — script `backfill:embeddings` runs the backfill with tsx.
- **Run (from project root):** `npm run backfill:embeddings` or `DELAY_MS=200 npm run backfill:embeddings` to add a delay between questions (avoids rate limits).
- **Confirm test:** `npm test -- lib/embedding-index.test.ts` (should pass).
- When satisfied, mark Task 6 **DONE** in the table above.

---

## Task 7: GET .../related API

- **Test first:** API test: mock QuestionEmbedding with 2 rows (question 1 and 2); GET `/api/admin/questions/1/related?k=1` as admin; expect body to include question 2’s slug, not 1’s.
- **Implement:** `app/api/admin/questions/[id]/related/route.ts` — require admin, load question, embed, k-NN, return slugs.
- **Confirm:** `npm test -- app/api/admin/questions/\[id\]/related` passes.
- **Ready for review:** `app/api/admin/questions/[id]/related/route.ts`, `app/api/admin/questions/[id]/related/route.test.ts`.

### Task 7 ready for review

- **Review:**
  - `app/api/admin/questions/[id]/related/route.ts` — GET: requireAdmin, load question, build embedding input, getEmbedding, k-NN via `$queryRawUnsafe` (ORDER BY embedding <=> $vector LIMIT k), return `{ slugs }`. Query param `k` (default 5, max 20).
  - `app/api/admin/questions/[id]/related/route.test.ts` — 401 when not admin, 404 when question missing, 200 with related slugs (mocks findUnique, getEmbedding, $queryRawUnsafe).
- **Confirm test:** `npm test -- related/route.test` (should pass).
- When satisfied, mark Task 7 **DONE** in the table above.

---

## Task 8: Admin UI “Related questions”

- **Test first:** Page or component test: mock related API to return 2 slugs; render admin question detail; assert “Related questions” section exists and shows links (or slugs) for those 2.
- **Implement:** On `app/admin/questions/[id]/page.tsx` (or client component), fetch related, render section with links to `/admin/questions/[id]` for each slug.
- **Confirm:** `npm test -- app/admin/questions/\[id\]/page.test` passes (or the component test).
- **Ready for review:** `app/admin/questions/[id]/page.tsx` (and any new component), test file.

---

## Task 9: Re-index on create/update

- **Test first:** Test: mock indexQuestionEmbedding; POST create question (or PATCH update); assert indexQuestionEmbedding was called with the new/updated questionId. Or assert QuestionEmbedding has a row for that id.
- **Implement:** In `app/api/admin/questions/route.ts` (create) and `app/api/admin/questions/[id]/route.ts` (update), after prisma write, call `indexQuestionEmbedding(questionId)`.
- **Confirm:** Test passes.
- **Ready for review:** Both route files, test file(s).

### Task 9 ready for review

- **Review:**
  - `app/api/admin/questions/route.ts` — after `prisma.question.create`, call `indexQuestionEmbedding(question.id)` (errors logged, response still 201).
  - `app/api/admin/questions/[id]/route.ts` — after update and revision create, call `indexQuestionEmbedding(idNum)` (errors logged, response still 200).
  - `app/api/admin/questions/route.test.ts` — mock `indexQuestionEmbedding`; create test asserts it was called with the new question id (99).
  - `app/api/admin/questions/[id]/route.test.ts` — mock `indexQuestionEmbedding`; update test asserts it was called with question id (4).
- **Confirm test:** `npm test -- app/api/admin/questions` (all 14 tests should pass).
- When satisfied, mark Task 9 **DONE** in the table above.

---

# Where to review (when status = IN_REVIEW)

When a task is marked **IN_REVIEW**, review:

| Task | Primary files to review |
|------|--------------------------|
| 1 | `prisma/migrations/*_enable_pgvector/` (or similar name) |
| 2 | `prisma/schema.prisma`, `prisma/migrations/*_question_embedding/` |
| 3 | `lib/embedding-input.ts`, `lib/embedding-input.test.ts` |
| 4 | `lib/embeddings.ts`, `lib/embeddings.test.ts` |
| 5 | `lib/embeddings.ts` or `lib/embedding-index.ts`, corresponding test |
| 6 | `scripts/backfill-question-embeddings.mjs` |
| 7 | `app/api/admin/questions/[id]/related/route.ts`, `route.test.ts` |
| 8 | `app/admin/questions/[id]/page.tsx` (and related component), test |
| 9 | `app/api/admin/questions/route.ts`, `app/api/admin/questions/[id]/route.ts`, tests |

**Run the relevant test** for that task (e.g. `npm test -- path/to/test.ts`) to confirm passing before you mark the task **DONE**.
