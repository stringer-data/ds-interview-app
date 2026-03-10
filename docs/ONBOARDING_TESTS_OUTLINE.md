# Onboarding flow – test outline (error messages)

Use this to implement tests that ensure the **right error messages** are shown for signup (and optionally login). Vitest is already set up; follow the pattern in `app/api/submit-answer/route.test.ts` (mock `@/lib/db`, etc.).

---

## 1. Signup API – `POST /api/auth/signup`

**File:** `app/api/auth/signup/route.test.ts`  
**Mock:** `@/lib/db` (prisma), no auth required for signup.

### 1.1 Validation (Zod) – must return 400 and structured error

| Case | Request body | Expected status | Expected `response.error` shape | User-facing message (client uses first field/form error or fallback) |
|------|--------------|-----------------|----------------------------------|----------------------------------------------------------------------|
| Invalid email | `{ email: "not-an-email", password: "longenough" }` | 400 | `{ fieldErrors: { email: ["..."] }, formErrors: [] }` | First string in `fieldErrors.email` |
| Password too short | `{ email: "a@b.co", password: "short" }` | 400 | `{ fieldErrors: { password: ["..."] }, ... }` | First string in `fieldErrors.password` |
| Missing email | `{ password: "longenough" }` | 400 | Zod flatten object | First available field/form error |
| Missing password | `{ email: "a@b.co" }` | 400 | Zod flatten object | First available field/form error |

Assert: `res.status === 400`, `body.error` has `fieldErrors` and/or `formErrors`, and that the first error string is present so the client can display it.

### 1.2 Duplicate email – must return 400 and clear message

| Case | Mock / setup | Expected status | Expected `response.error` |
|------|----------------|-----------------|----------------------------|
| Email already exists (findUnique returns a user) | `prisma.user.findUnique` resolves to `{ id: "x", email: "..." }` | 400 | `"Email already registered"` |
| Unique constraint on create (P2002) | `prisma.user.findUnique` resolves to `null`, `prisma.user.create` throws `Prisma.PrismaClientKnownRequestError` with `code: "P2002"` | 400 | `"Email already registered"` |

Assert: `res.status === 400`, `body.error === "Email already registered"`.

### 1.3 Database schema out of date – must return 500 and friendly message

| Case | Mock / setup | Expected status | Expected `response.error` |
|------|----------------|-----------------|----------------------------|
| Prisma error about missing column | `prisma.user.findUnique` throws Error with message containing `"does not exist in the current database"` | 500 | `"Database schema is out of date. Run: npx prisma db push"` |

Assert: `res.status === 500`, `body.error === "Database schema is out of date. Run: npx prisma db push"`.

### 1.4 Other server errors – must return 500 and generic message

| Case | Mock / setup | Expected status | Expected `response.error` |
|------|----------------|-----------------|----------------------------|
| Unexpected Prisma error | `prisma.user.create` throws generic Error (e.g. connection) | 500 | `"Signup failed. Please try again."` |

Assert: `res.status === 500`, `body.error === "Signup failed. Please try again."`.

### 1.5 Success – must return 200 and user payload

| Case | Mock / setup | Expected status | Expected response |
|------|----------------|-----------------|-------------------|
| New email, valid body | `prisma.user.findUnique` → null, `prisma.user.create` → user object | 200 | `{ id, email, tier }`, no `error` |

Assert: `res.status === 200`, body has `id`, `email`, `tier`; no `error`.

---

## 2. Signup page (client) – error message display

**File:** `app/signup/page.test.tsx` (or similar, with React Testing Library if you add it).  
**Focus:** For each API response shape, the **visible error message** in the UI is the expected one.

### 2.1 Client-side validation (no API call)

| Case | User action | Expected visible error |
|------|-------------|-------------------------|
| Passwords don’t match | Fill form, set password ≠ confirm password, submit | `"Passwords don't match."` |

### 2.2 API returns string error

| Case | Mock `fetch` response | Expected visible error |
|------|------------------------|------------------------|
| Duplicate email | `{ ok: false, status: 400 }`, `res.json()` → `{ error: "Email already registered" }` | `"Email already registered"` |
| Schema out of date | `{ ok: false, status: 500 }`, `res.json()` → `{ error: "Database schema is out of date. Run: npx prisma db push" }` | Same string |
| Generic server error | `{ ok: false, status: 500 }`, `res.json()` → `{ error: "Signup failed. Please try again." }` | Same string |

### 2.3 API returns Zod-flattened error (object)

| Case | Mock `fetch` response | Expected visible error |
|------|------------------------|------------------------|
| Invalid email (Zod) | `{ ok: false, status: 400 }`, `res.json()` → `{ error: { fieldErrors: { email: ["Invalid email"] }, formErrors: [] } }` | `"Invalid email"` (or first field error) |
| Multiple field errors | `{ error: { fieldErrors: { password: ["String must contain at least 8 character(s)"] }, formErrors: [] } }` | First field error string |
| Form-level error only | `{ error: { fieldErrors: {}, formErrors: ["Something went wrong"] } }` | `"Something went wrong"` |

### 2.4 API returns non-JSON or missing error

| Case | Mock `fetch` response | Expected visible error |
|------|------------------------|------------------------|
| 500 with empty body / parse failure | `res.json()` throws or returns `{}` | `"Signup failed. If this email is already registered, try logging in."` (fallback) |

---

## 3. Error message reference (single source of truth)

Use this list when implementing or changing copy; keep tests in sync.

| Scenario | Exact message |
|----------|----------------|
| Client: passwords don’t match | `Passwords don't match.` |
| API: email already in DB (findUnique or P2002) | `Email already registered` |
| API: Zod validation (client shows first field/form error) | From `error.fieldErrors.*[0]` or `error.formErrors[0]` |
| API: DB schema out of date | `Database schema is out of date. Run: npx prisma db push` |
| API: other server error | `Signup failed. Please try again.` |
| Client: fallback when no parseable error | `Signup failed. If this email is already registered, try logging in.` |

---

## 4. Implementation order

1. **Signup API tests** – implement 1.1–1.5 in `app/api/auth/signup/route.test.ts`; mock `prisma.user.findUnique`, `prisma.user.create`, `prisma.invite.findUnique`, `prisma.invite.update` as needed.
2. **Signup page tests** – add `app/signup/page.test.tsx` (or under `__tests__`); mock `fetch` and optionally `signIn` from `next-auth/react`; render the form, perform actions, assert the error text in the document (e.g. `screen.getByText(/.../)`).

Running tests: `npm run test` (or `npm run test:watch`).
