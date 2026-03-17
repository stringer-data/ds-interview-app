
# Changelog

All notable changes to the DS Trainer app are documented here.

---

# Unreleased

- Pre-launch documentation: ENVIRONMENT, PRODUCTION checklist, API reference, PRIVACY, TERMS (see `docs/`).

---

# Question System and Admin (Pre-Launch)

## Admin Questions

- List at `/admin/questions` with topic, theme, dimension, difficulty, active, and tag filters.
- Sort by created_at, avg score, avg rating.
- Columns: times asked, avg score, avg rating, flags count.
- Create question at `/admin/questions/new`.

## Admin Question Detail

- `/admin/questions/[id]` — Stats (times asked, last asked), score distribution (0–4), feedback (ratings summary, comments/insights list, open flags).
- Edit form: topic, theme, category, tags, difficulty, active, question text, reference answer.
- PATCH and POST APIs for update/create.

## User Feedback

- Rate question (1–5) after attempt.
- Add comment/insight after attempt.
- `POST /api/rate-question`, `POST /api/question-comment`.

## Question Bank

- Questions stored in DB (Prisma).
- YAML import script.
- Topics/themes from DB; difficulty labels and categories in `lib/question-admin.ts`.

## Docs Added

- `docs/ENVIRONMENT.md`, `docs/PRODUCTION.md`, `docs/API.md`, `docs/PRIVACY.md`, `docs/TERMS.md`.

---

# Earlier

- Landing, auth (login/signup, NextAuth), practice flow (next question, submit answer, LLM grading, scorecard).
- Admin: users table, invites, tier management.
- Free/paid tier and question cap; Stripe placeholders for Phase 2.
