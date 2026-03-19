
# Production Launch Checklist

Use this before opening the app to real users.

---

# 1. Environment

Status key: **TODO** → **IN-REVIEW** → **DONE**

| # | Step | Status |
|---|------|--------|
| 1.1 | Set `NEXTAUTH_URL` to your production URL (e.g. `https://yourdomain.com` or Vercel URL). App validates at startup in production (see `lib/env.ts`, `instrumentation.ts`). | DONE |
| 1.2 | Set `NEXTAUTH_SECRET` to a strong random string (e.g. `openssl rand -base64 32`). App validates it in production (non-empty, at least 32 characters). | DONE |
| 1.3 | Set `ADMIN_EMAILS` to comma-separated admin emails; verify no typos. App validates in production (required, at least one valid email). | DONE |
| 1.4 | Set `DATABASE_URL` to production Postgres (Neon/Supabase or other); enable SSL if required. App validates in production (required, must be postgresql:// or postgres://). | DONE |
| 1.5 | Set `OPENAI_API_KEY` to a valid key (used for grading and help). App validates in production (required, must start with sk-). | DONE |
| 1.6 | Set `PAYMENTS_ENABLED` to `false` for soft launch, or `true` with Stripe vars configured. App validates in production (must be exactly true or false). | DONE |

---

# 2. Database

Status key: **TODO** → **IN-REVIEW** → **DONE**

| # | Step | Status |
|---|------|--------|
| 2.1 | Apply schema to production DB: run `npx prisma migrate deploy` (or `npx prisma db push` if not using migration history). Use production `DATABASE_URL`. | TODO |
| 2.2 | Configure backups: use your provider’s backups (e.g. Neon dashboard) or a cron that dumps/restores. | TODO |
| 2.3 | Seed questions (if app uses DB for questions): run the YAML import once against production. See below. | TODO |

**2.1 — Apply schema (production)**  
From repo root, with production `DATABASE_URL` set:
```bash
npx prisma migrate deploy
```
Or, if you use schema-only (no migration history): `npx prisma db push`.  
Verify: `npx prisma db execute --stdin <<< "SELECT 1 FROM \"User\" LIMIT 1;"` (or open Prisma Studio) to confirm tables exist.

**2.2 — Backups**  
Neon: Backups in project Settings. Supabase: Automated backups in plan. Otherwise: periodic `pg_dump` or provider backup schedule.

**2.3 — Seed questions**  
One-off, with production `DATABASE_URL` and path to your YAML question bank:
```bash
QUESTIONS_PATH=/path/to/questions node scripts/import-questions-from-yaml.mjs
```
Then confirm in `/admin/questions` or `npx prisma studio` that questions exist.

---

# 3. Deploy

- [ ] Build passes: `npm run build`
- [ ] Env vars set in hosting (Vercel / etc.) for production
- [ ] First deploy done; `NEXTAUTH_URL` updated if the URL changed after deploy

---

# 4. Smoke Test

- [ ] Sign up → log in → open `/app`
- [ ] Answer a question → see feedback → rate question → add an insight (optional)
- [ ] Check scorecard and account page
- [ ] Log in as admin → open `/admin` → open `/admin/questions` → view/edit a question

---

# 5. Optional but Recommended

- [ ] Error monitoring (e.g. Sentry or host’s error reporting)
- [ ] Rate limiting on `POST /api/submit-answer` and grading to avoid abuse/cost spikes
- [ ] Privacy policy and terms linked from footer or signup (see `docs/PRIVACY.md`, `docs/TERMS.md`)

---

# 6. When Enabling Payments

- [ ] `PAYMENTS_ENABLED=true`
- [ ] Stripe keys and webhook secret set
- [ ] Webhook endpoint registered in Stripe and tested
- [ ] `FREE_QUESTION_CAP` set for free tier
