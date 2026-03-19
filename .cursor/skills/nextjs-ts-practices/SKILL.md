---
name: nextjs-ts-practices
description: Next.js App Router with TypeScript and plain CSS. Use when editing .tsx/.ts files, adding routes, components, or API routes in this Next.js app.
---

# Next.js + TypeScript Practices (this app)

This app uses **Next.js App Router**, **React**, **TypeScript**, and **plain CSS** (no Tailwind). Code lives under `app/`, `lib/`, and `components/` at the repo root (no `src/`).

## Structure

- **Routes and route UI:** `app/` (e.g. `app/app/page.tsx`, `app/api/.../route.ts`)
- **Shared UI:** under `app/` or a `components/` directory; use lowercase-with-dashes for dirs (e.g. `components/auth-wizard`)
- **Utilities, data, auth:** `lib/` (e.g. `lib/questions.ts`, `lib/topics.ts`)

## Components

- Prefer **Server Components**; mark client components with `'use client'` only when needed (hooks, events, browser APIs).
- Wrap client components in **Suspense** with a fallback where it helps loading UX.
- Use **dynamic loading** for heavy or non-critical components.
- Put static content and type definitions at the end of the file when it keeps the file readable.

## Performance

- Minimize `useEffect` and client state; prefer server-rendered or server-fetched data where possible.
- Use dynamic imports for non-critical code.
- Use reasonable caching (e.g. fetch options, route segment config) where it fits.

## Data and API

- Fetch in **Server Components** when possible; use route handlers in `app/api/` for mutations and client-driven requests.
- Handle loading and error states in UI; return clear status/errors from API routes.
- Validate request bodies (e.g. **Zod**) in API routes and handle validation errors explicitly.

## Routing

- Follow **App Router** conventions: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`.
- Use **dynamic segments** (e.g. `[id]`) and **searchParams** where needed.
- Add loading/error boundaries for routes that need them.

## Forms and validation

- Use **Zod** for request/body validation (already used in this app).
- Validate on the server in API routes; surface errors clearly to the client.
- Show loading/disabled state during submit where appropriate.

## State

- Prefer **server state** and refetch (or revalidate) over large client state.
- Use React state or URL state for local UI; use Context sparingly.
- Keep loading and error state explicit in the UI.
