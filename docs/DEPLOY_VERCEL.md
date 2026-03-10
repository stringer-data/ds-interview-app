# Deploy to Vercel

Get the app running at a `*.vercel.app` URL (or your own domain).

---

## 1. Question bank (required for practice)

The app loads questions from the filesystem via `QUESTIONS_PATH`. On Vercel, that path must be **inside** the deployed repo.

**Option A — Bundle questions in this repo (recommended)**

1. Copy the question bank into the app:
   ```bash
   mkdir -p data
   cp -R /path/to/ds-interview-trainer-v1/data/questions data/
   ```
2. Commit and push:
   ```bash
   git add data/
   git commit -m "Add question bank for Vercel"
   git push
   ```
3. In Vercel, set env var: `QUESTIONS_PATH=data/questions`

**Option B — Deploy without questions**

- Omit `QUESTIONS_PATH` or set it to `data/questions` and add an empty `data/questions` folder. The app will run but show "No questions available" until you add YAML files.

---

## 2. Connect the repo to Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in (use **GitHub**).
2. Click **Add New…** → **Project**.
3. Import **stringer-data/ds-interview-app** (or your fork). Use the **main** (or default) branch unless you want to deploy a different branch.
4. **Framework Preset:** Vercel should detect **Next.js**; leave as is.
5. **Root Directory:** leave blank (app is the repo root).
6. **Build Command:** `npm run build` (default).
7. **Output Directory:** leave default (Next.js uses `.next`).

---

## 3. Environment variables

In the Vercel project → **Settings** → **Environment Variables**, add:

| Variable | Value | Notes |
|----------|--------|--------|
| `DATABASE_URL` | Your Postgres URL | Use **Neon** or **Supabase** (with `?sslmode=require`). Same DB as local if you want shared data. |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Replace with your actual Vercel URL (e.g. `https://ds-interview-app.vercel.app`). Update after first deploy if the URL changes. |
| `NEXTAUTH_SECRET` | Long random string | Generate with `openssl rand -base64 32`. Same as local if you want same sessions. |
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI key (grading). |
| `ADMIN_EMAILS` | `you@example.com` | Comma-separated; who can access `/admin`. |
| `QUESTIONS_PATH` | `data/questions` | If you bundled the question bank as in step 1. |

Optional (defaults are fine for Phase 1):

- `PAYMENTS_ENABLED` = `false`
- `FREE_QUESTION_CAP` = `10`
- `NPM_CONFIG_LOGLEVEL` = `error` — Hides npm deprecation warnings (e.g. `node-domexception`) from the build log. That warning comes from the OpenAI SDK and is harmless.

---

## 4. Deploy

1. Click **Deploy**. Vercel will run `npm run build` and deploy.
2. After the first deploy, copy the **Production URL** (e.g. `https://ds-interview-app-xxx.vercel.app`).
3. In **Settings** → **Environment Variables**, set `NEXTAUTH_URL` to that URL (and redeploy if needed so NextAuth uses the correct origin).

---

## 5. Database (Neon / Supabase)

- Use the **same** `DATABASE_URL` as local, or create a new project (e.g. on Neon) for production.
- Ensure the DB has the schema: from your machine run `npx prisma db push` (or migrations) against that URL so tables exist before the app runs.

---

## 6. Optional: Vercel CLI

To deploy from the terminal:

```bash
npm i -g vercel
cd /Users/stringer/Projects/ds-trainer-app
vercel
```

Follow the prompts (link to existing project or create new). Env vars are usually set in the Vercel dashboard, not via CLI.
