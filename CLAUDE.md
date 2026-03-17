# ds-trainer-app — Repo rules

Practice app for data science interview topics (A/B testing, causal inference, stats, ML, product sense). Next.js 16 App Router, React 18, Prisma, NextAuth, Vitest, Testing Library. Tests are **colocated** (e.g. `app/signup/page.test.tsx`, `app/api/submit-answer/route.test.ts`); keep it that way.

---

## Structure

- **app/** — Routes, pages, layouts, API routes (`app/api/...`). Colocate tests as `*.test.ts` / `*.test.tsx` next to the code.
- **components/** — Shared UI components.
- **lib/** — Shared logic (auth, db, questions, grader, topics, etc.).
- **prisma/** — Schema and migrations. DB holds users, attempts, questions (from YAML import), topics, themes.
- **scripts/** — One-off and import scripts (e.g. import questions from YAML).
- **.cursor/rules/** — Cursor rules (e.g. testing). Use `.mdc` with frontmatter.

---

## Testing (longer version)

### Bug fixes

Every bug fix must include a regression test. Workflow:

1. Reproduce the bug with a failing test first whenever feasible.
2. Implement the smallest fix.
3. Verify the test passes.

Bug fixes are not complete without a regression test unless automation is impossible.

### Features

New features must include tests covering main behavior and important edge cases.

### Test layers

Prefer the lowest reliable layer: **unit → component → integration → e2e**. Avoid unnecessary E2E tests.

### Philosophy

Tests should verify **behavior**, not implementation details.

- **Prefer:** user-visible outcomes, input/output behavior, state changes.
- **Avoid:** testing internal implementation, brittle selectors, excessive mocking.

### Code changes

If code behavior changes and no test exists, add one. Do not leave behavior untested.

### Clarity

Explain the test and the fix clearly; the repo owner is still learning.

### How we run tests

- **Runner:** Vitest. `npm run test` / `npm run test:watch`.
- **Config:** `vitest.config.ts` — Node by default; `**/*.test.tsx` uses jsdom. Setup: `vitest.setup.ts` (jest-dom).
- **API routes:** Import handler (`POST`/`GET`), call with `Request`, mock `@/lib/*` with `vi.mock`, assert status and body.
- **Components:** `@vitest-environment jsdom`, `@testing-library/react`, mock `next/navigation` and `next-auth/react`. Prefer `getByRole` / `getByLabelText`. Use `@/` path alias.

---

## Conventions

- Use the `@/` path alias for imports.
- Auth: `lib/auth.ts` (`getCurrentUser`, `requireAdmin`, `isAdminEmail`). Admin routes use `requireAdmin()`.
- Questions: loaded from DB via Prisma (`lib/questions.ts`); admin CRUD and edit on `/admin/questions` and `/admin/questions/[id]`.
