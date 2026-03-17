
# Production Launch Checklist

Use this before opening the app to real users.

---

# 1. Environment

Status key: **TODO** → **IN-REVIEW** → **DONE**

| # | Step | Status |
|---|------|--------|
| 1.1 | Set `NEXTAUTH_URL` to your production URL (e.g. `https://yourdomain.com` or Vercel URL). App validates at startup in production (see `lib/env.ts`, `instrumentation.ts`). | DONE |
| 1.2 | Set `NEXTAUTH_SECRET` to a strong random string (e.g. `openssl rand -base64 32`). | TODO |
| 1.3 | Set `ADMIN_EMAILS` to comma-separated admin emails; verify no typos. | TODO |
| 1.4 | Set `DATABASE_URL` to production Postgres (Neon/Supabase or other); enable SSL if required. | TODO |
| 1.5 | Set `OPENAI_API_KEY` to a valid key (used for grading and help). | TODO |
| 1.6 | Set `PAYMENTS_ENABLED` to `false` for soft launch, or `true` with Stripe vars configured. | TODO |

---

# 2. Database

- [ ] Schema applied: `npx prisma db push` (or migrations) against production DB
- [ ] Backups configured (provider or cron)
- [ ] If using DB for questions: run the YAML import script once to seed, or ensure questions exist

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
