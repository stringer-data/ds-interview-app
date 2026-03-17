
# Next Steps

Prioritized list so you can pick up where you left off. Adjust order to match your goals (launch first vs. features first).

---

# 1. Close Out Current Work (5 min)

- [ ] **Mark P13 and P15 DONE** in `ideas/question-system-backlog.md` if you’re happy with:
  - P13: Admin detail → Feedback → Comments (Insights) list
  - P15: Admin detail → Edit topic/theme (dropdowns + PATCH)
- [ ] Merge or finalize PR **#4** (feature/question-system-admin) if it’s still open.

---

# 2. Launch Readiness (Before Real Users)

Follow `docs/PRODUCTION.md` in order:

- [ ] **Environment** — Set production `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_EMAILS`, `DATABASE_URL`, `OPENAI_API_KEY`. Keep `PAYMENTS_ENABLED=false` for soft launch.
- [ ] **Database** — Run `npx prisma db push` (or migrations) on production DB; set up backups; seed questions (YAML import) if needed.
- [ ] **Deploy** — Push to Vercel (or host); set env vars; confirm build and first deploy.
- [ ] **Smoke test** — Sign up, answer a question, rate/add insight, check scorecard; log in as admin, open `/admin/questions`, view/edit a question.
- [ ] **Optional** — Add error monitoring (e.g. Sentry); add rate limiting on submit-answer/grading; link Privacy and Terms from footer/signup.
- [ ] **Legal** — In `docs/PRIVACY.md` and `docs/TERMS.md`, replace `[DATE]`, `[CONTACT EMAIL]`, and any `[GOVERNING LAW]` placeholders; get a quick legal review if you’re offering to the public.

---

# 3. Backlog: One Remaining Task (P16)

- [ ] **P16 — Admin detail: revision history**  
  Show who changed what and when for each question (read from `QuestionRevision`). One backlog item; implement, set IN_REVIEW, then mark DONE when you’re satisfied.

---

# 4. Product Ideas (from `ideas/next-update.md`)

Turn these into backlog items or spikes when you’re ready. Suggested order:

| Idea | What it means | Effort |
|------|----------------|--------|
| **See feedback** | You need to see user feedback (ratings, comments, flags) — already in admin detail; confirm it’s enough or add filters/export. | Check |
| **Add notes with feedback** | Let admins add internal notes to a question or to a piece of feedback. | Small (schema + UI) |
| **Filter if it does not have response variable** | Filter questions (e.g. in admin or practice) by “has response variable” or similar. | Small (tag or field + filter) |
| **Show user: last asked date + score** | In practice (or scorecard), show “Last asked: date” and “Your score: X” for that question. | Medium (data + UI) |
| **Choice: review related or next level** | After feedback, offer “Review a related question” vs “Next question” (e.g. same topic/difficulty vs harder). | Medium (next-question API + UI) |
| **Reduce number of themes** | Consolidate themes in DB and in UI (admin + practice). | Small (data + deploy) |
| **RAG to review and tag questions** | Use RAG/embeddings to suggest tags, duplicates, or groupings for the question bank. | Large (RAG pipeline + admin UI) |
| **Edit question in flow (admin only)** | While going through practice as admin, “Edit this question” opens edit form or admin detail. | Small (link + permission check) |
| **Admin list edge-to-edge** | Admin questions table uses full width (e.g. remove or relax max-width on the list container). | Tiny (CSS/layout) |

---

# 5. Marketing and Positioning

- [ ] **Use `docs/MARKETING_OVERVIEW.md` with ChatGPT** — Paste the overview and ask for landing copy, social posts, or launch messaging.
- [ ] **Optional: Add Marketing Skills (marketingskills repo)**  
  - Create a **product-marketing-context** file (format from [marketingskills](https://github.com/coreyhaines31/marketingskills)) and fill it from `MARKETING_OVERVIEW.md`.  
  - Install skills you care about (e.g. `page-cro`, `copywriting`, `launch-strategy`) via clone or `npx skills add coreyhaines31/marketingskills --skill ...`.  
  - Then ask the agent to optimize the landing page or signup flow using those skills.
- [ ] **Landing page** — Implement or refine headline, bullets, and CTA using the overview (and any copy from ChatGPT or the skills).

---

# 6. After Launch

- [ ] **Turn on payments** (optional) — Set `PAYMENTS_ENABLED=true`, configure Stripe, set `FREE_QUESTION_CAP`, test checkout and webhook.
- [ ] **Iterate from feedback** — Use admin feedback (ratings, comments, flags) to fix or improve questions and flows.
- [ ] **Revisit next-update ideas** — Prioritize “last asked + score,” “review related vs next,” and “admin quick-edit” if they’re high value.

---

# Quick Reference

| Goal | Doc or location |
|------|------------------|
| Launch checklist | `docs/PRODUCTION.md` |
| Env vars | `docs/ENVIRONMENT.md` |
| Backlog (P16, etc.) | `ideas/question-system-backlog.md` |
| Product ideas | `ideas/next-update.md` |
| Marketing input for AI | `docs/MARKETING_OVERVIEW.md` |
| API reference | `docs/API.md` |
