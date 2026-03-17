
# Environment Variables

Reference for every env var the app uses. Copy `.env.example` to `.env` and set values. Never commit `.env`.

---

# Required

- **DATABASE_URL** — Postgres connection string (e.g. Neon, Supabase, or local). Use `?sslmode=require` for cloud DBs that require SSL.
- **NEXTAUTH_URL** — Full URL of the app: `http://localhost:3000` locally; `https://yourdomain.com` in production. Must match the origin users hit.
- **NEXTAUTH_SECRET** — Secret for signing sessions. Generate with `openssl rand -base64 32`.
- **OPENAI_API_KEY** — OpenAI API key (starts with `sk-...`) used for grading answers and the Help feature.
- **ADMIN_EMAILS** — Comma-separated list of emails that can access `/admin`. Trimmed and lowercased. Example: `admin@example.com,you@example.com`.

---

# Optional

- **QUESTIONS_PATH** — Path to YAML question bank (absolute or relative to app root). Used for initial seed/import; app reads questions from the database at runtime. Omit if questions are loaded only from DB after running the import script.
- **PAYMENTS_ENABLED** — `true` or `false`. Default: treat as `false` if unset. When `false`, no paywall; when `true`, free tier is capped by `FREE_QUESTION_CAP` and Stripe is used for paid.
- **FREE_QUESTION_CAP** — Max free questions per user when payments are enabled. Default: `10`. Ignored when `PAYMENTS_ENABLED=false`.
- **NPM_CONFIG_LOGLEVEL** — Set to `error` to reduce npm warnings in build logs (e.g. on Vercel).

---

# When Payments Enabled

- **STRIPE_SECRET_KEY** — Stripe secret key (e.g. `sk_live_...` or `sk_test_...`).
- **STRIPE_WEBHOOK_SECRET** — Stripe webhook signing secret (`whsec_...`) for the checkout/webhook endpoint.
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** — Stripe publishable key (`pk_...`) for the client.

---

# Production Notes

- Set `NEXTAUTH_URL` to your real production URL.
- Use a strong, unique `NEXTAUTH_SECRET` (different from local is fine).
- Set `ADMIN_EMAILS` to the real admin addresses.
- Prefer a dedicated production database; run `npx prisma db push` or migrations against it before first deploy.
