# First-time setup: run the app locally

Do these steps once. You need: a **database URL** and an **OpenAI API key**.

---

## Step 1: Get a database (pick one option)

### Option A — Free cloud DB (easiest, no install)

1. Go to **[neon.tech](https://neon.tech)** (or [supabase.com](https://supabase.com)).
2. Sign up (free).
3. Create a new project. Neon will show a connection string like:
   ```text
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Copy that full URL — you’ll paste it in Step 2 as `DATABASE_URL`.

### Option B — Postgres on your Mac

1. Install Postgres (if you don’t have it):
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```
2. Create a database and user. In Terminal:
   ```bash
   createuser -s postgres   # if needed
   createdb ds_trainer
   ```
   Your URL is:
   ```text
   postgresql://YOUR_MAC_USERNAME@localhost:5432/ds_trainer
   ```
   (Replace `YOUR_MAC_USERNAME` with your Mac login name — run `whoami` to see it. Often no password for local.)

---

## Step 2: Get an OpenAI API key

1. Go to **[platform.openai.com](https://platform.openai.com)** and sign in (or create an account).
2. Open **API keys** (in the menu or profile).
3. Click **Create new secret key**. Copy the key (it starts with `sk-...`). You won’t see it again.

---

## Step 3: Create your `.env` file

The app folder should already have a `.env` file. Open it in your editor.

Set these (replace the placeholders):

| Variable | What to put |
|----------|---------------------|
| `QUESTIONS_PATH` | Leave as is: `../ds-interview-trainer-v1/data/questions` (so the app finds the question bank). |
| `DATABASE_URL` | The Postgres URL from Step 1 (in quotes). Example: `"postgresql://user:pass@host/dbname?sslmode=require"` |
| `NEXTAUTH_URL` | Leave as is: `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Leave as is (already filled with a random string). |
| `OPENAI_API_KEY` | Your OpenAI key from Step 2, e.g. `sk-proj-...` |
| `ADMIN_EMAILS` | Your email so you can open `/admin`, e.g. `you@gmail.com` |

Save the file. Don’t commit `.env` (it’s in `.gitignore`).

---

## Step 4: Create the database tables

In Terminal, from the app folder:

```bash
cd /Users/stringer/Projects/ds-trainer-app
npx prisma db push
```

You should see something like: “Your database is now in sync with your schema.”  
If you get a connection error, check `DATABASE_URL` in `.env` (no extra spaces, correct password, correct host/db name).

---

## Step 5: Start the app

```bash
npm run dev
```

You should see: “Ready on http://localhost:3000” (or similar).

---

## Step 6: Try it in the browser

1. Open **http://localhost:3000**
2. Click **Start free** → sign up with any email and a password (min 8 characters).
3. After signup, go to **http://localhost:3000/app** — you should see a question and the scorecard.
4. To open the admin page, use the same email you put in `ADMIN_EMAILS`: go to **http://localhost:3000/admin**.

If something fails, check:  
- `.env` has no typos and no spaces around `=`.  
- For Neon/Supabase: `DATABASE_URL` includes `?sslmode=require` if they require it.  
- You ran `npx prisma db push` from the `ds-trainer-app` folder.

---

## Pushing to GitHub

The repo already has `origin` set to `https://github.com/stringer-data/ds-interview-app.git`. To push you need to authenticate once. Pick one option.

### Option A — GitHub CLI (easiest)

1. Install the CLI (if needed): `brew install gh`
2. In Terminal, from any folder, run:
   ```bash
   gh auth login
   ```
3. Choose **GitHub.com** → **HTTPS** → **Login with a web browser**. Follow the prompts.
4. Then push:
   ```bash
   cd /Users/stringer/Projects/ds-trainer-app
   git push -u origin main
   ```

### Option B — Personal Access Token (HTTPS)

1. Open **[github.com/settings/tokens](https://github.com/settings/tokens)** → **Generate new token (classic)**.
2. Name it (e.g. “ds-interview-app”), check **repo**, then generate. Copy the token.
3. In Terminal:
   ```bash
   cd /Users/stringer/Projects/ds-trainer-app
   git push -u origin main
   ```
4. When prompted: **Username** = your GitHub username; **Password** = paste the token (not your GitHub password).

### Option C — SSH

1. If you don’t have an SSH key, create one: `ssh-keygen -t ed25519 -C "your@email.com"` (Enter to accept defaults).
2. Add the key to the agent: `eval "$(ssh-agent -s)"` then `ssh-add ~/.ssh/id_ed25519`.
3. Copy your **public** key: `pbcopy < ~/.ssh/id_ed25519.pub`. Add it at **[github.com/settings/keys](https://github.com/settings/keys)** → **New SSH key**.
4. Use SSH for this repo and push:
   ```bash
   cd /Users/stringer/Projects/ds-trainer-app
   git remote set-url origin git@github.com:stringer-data/ds-interview-app.git
   git push -u origin main
   ```
