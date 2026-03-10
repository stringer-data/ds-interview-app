# App improvements — ideas backlog

Ideas for UX, reliability, and product improvements. Not in MVP; add when ready.

---

## Auth & signup

- **Confirm password on signup**  
  Add a "Confirm password" field on the signup form; require it to match the password before submitting. Show a clear error if they don't match. Reduces typos and failed logins.

- **Capture timezone on signup**  
  Detect or ask for the user's local timezone at signup (e.g. via `Intl.DateTimeFormat().resolvedOptions().timeZone` or a small selector). Store on the user (e.g. `users.timezone`). Use for: "practice today" counts, reminder send times, and any time-based copy (e.g. "questions answered today" in their local day).

- **Other signup sources**  
  `signup_source` is stored as a string (`organic` | `invite` today). To track referral, campaign, or UTM later: pass `signup_source` from the client (e.g. from URL params like `?ref=twitter` or `utm_source`) and optionally add columns like `signup_utm_source`, `signup_utm_medium` for analytics.

---

## Other ideas (to expand)

- *Add more as you go: landing copy, upsell flow, admin filters, etc.*
