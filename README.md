# DS Trainer App

Web app for the DS Interview Trainer: landing, auth, practice (scorecard + question → grade → next), free/paid tier, and admin (users, invites).

**Before pushing:** Never commit `.env` (it’s in `.gitignore`). Use `.env.example` as a template; keep real keys and `DATABASE_URL` local only.

**Spec:** See `../ds-interview-trainer-v1/web-app-ideas/build_brief.md` (and `ideas.md`, `marketing_ideas.md`).

## Setup

1. **Clone / create app**  
   App lives in `Projects/ds-trainer-app`; question bank stays in `ds-interview-trainer-v1`.

2. **Env**  
   Copy `.env.example` to `.env` and set:
   - `QUESTIONS_PATH` — path to `ds-interview-trainer-v1/data/questions` (e.g. `../ds-interview-trainer-v1/data/questions`)
   - `DATABASE_URL` — Postgres connection string
   - `NEXTAUTH_URL` — e.g. `http://localhost:3000`
   - `NEXTAUTH_SECRET` — long random string
   - `OPENAI_API_KEY` — for grading and help
   - `ADMIN_EMAILS` — comma-separated emails that can access `/admin`
   - For Phase 1 testing: `PAYMENTS_ENABLED=false` (no paywall). Optionally `FREE_QUESTION_CAP=10` for when you turn payments on.

3. **Database**  
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   ```

4. **Run**  
   ```bash
   npm run dev
   ```  
   Open http://localhost:3000. Sign up, then go to `/app` to practice. Admin: `/admin` (only for emails in `ADMIN_EMAILS`).

## Routes

- `/` — Landing
- `/login`, `/signup` — Auth (signup accepts `?invite=<code>`)
- `/app` — Practice (scorecard + question, Next / Help / Submit)
- `/admin` — Users table, create invite, set user tier

## API

- `POST /api/auth/signup` — body: `{ email, password, invite_code? }`
- `GET /api/next-question` — returns next question or `{ upsell: true }` when over free cap
- `POST /api/submit-answer` — body: `{ question_id, follow_up_id?, answer }`
- `GET /api/scorecard`
- `GET /api/help?question_id=...`
- `GET /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/invites`

## Launch phases

- **Phase 1:** `PAYMENTS_ENABLED=false` — test with a few people; use admin invites and set tier to paid. No Stripe.
- **Phase 2:** `PAYMENTS_ENABLED=true` — free cap and Stripe (wire checkout + webhook when ready).
