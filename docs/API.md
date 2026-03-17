
# API Reference

All API routes and expected request/response shapes. Authenticated routes require a valid session (cookie); admin routes require the user’s email to be in `ADMIN_EMAILS`.

---

# Auth

- **POST /api/auth/signup** — Body: `{ email, password, invite_code? }`. Creates user; returns session. No auth required.
- **NextAuth /api/auth/\*** — Handlers for sign in, sign out, session.

---

# Practice (Require Login)

- **GET /api/next-question** — Query: `topic?` (optional). Returns next question for the user or `{ upsell: true, questionsUsed, cap }` when over free cap.
- **POST /api/submit-answer** — Body: `{ question_id, follow_up_id?, answer }` or `{ question_id: "custom", custom_question, custom_topic, answer }`. Returns feedback (score, verdict, whatWasGood, missingWrong, exampleAnswers, followUpQuestion, nextQuestion?, upsell?).
- **GET /api/scorecard** — Query: `timezone?`. Returns scorecard (tier, questionsUsed, questionsLeft, totalPoints, maxPoints, overallPct, today*, streak, streakEndsOn, accuracyByTopic).
- **GET /api/help** — Query: `question_id`. Returns help text for the question. 401 if not logged in.
- **POST /api/rate-question** — Body: `{ question_id: string (slug), rating: number (1–5) }`. Records a rating for the last attempted question.
- **POST /api/question-comment** — Body: `{ question_id: string (slug), body: string (1–2000 chars) }`. Adds a comment/insight for the question.

---

# Account (Require Login)

- **GET /api/account** — Returns current user profile. 401 if not logged in.
- **PATCH /api/account/password** — Body: `{ currentPassword, newPassword }`. Changes password. 401 if not logged in.

---

# Admin (Require Admin Email)

- **GET /api/admin/users** — List users (for admin table).
- **PATCH /api/admin/users/:id** — Body: `{ tier? }`. Update user tier.
- **POST /api/admin/invites** — Body: `{ email? }`. Create invite code.
- **POST /api/admin/questions** — Body: `slug`, `topic_slug`, `theme_slug`, `difficulty_level`, `question`, `reference_answer?`, `category?`, `tags?`, `active?`. Create question.
- **PATCH /api/admin/questions/:id** — Body: `question?`, `reference_answer?`, `difficulty_level?`, `active?`, `category?`, `tags?`, `topic_id?`, `theme_id?`. Update question.

Note: Question list is server-rendered on `/admin/questions`; there is no GET API for the list.

---

# Errors

- **401** — Unauthorized (not logged in or session invalid).
- **403** — Forbidden (e.g. not an admin).
- **400** — Bad request (validation or body error).
- **404** — Not found (e.g. question id/slug).
- **500** — Server error.

Responses typically include a JSON body with an `error` string when applicable.
