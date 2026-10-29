# ClientDesk

A freelance client and invoice manager you can actually use: sign up, keep clients in
one place, track what is paid, unpaid, and overdue, and export invoices as CSV. Every
account sees only its own data.

Built by Muhammad Ahmad — web developer in Rawalpindi / Islamabad, open to remote work.
Contact: muhammadahmad.codes@gmail.com

## What it does

- **Accounts:** sign up and log in with email + password (minimum 8 characters).
  Passwords are hashed with scrypt + a random salt; sessions are random tokens stored
  hashed, sent as an httpOnly cookie. No OAuth, no external auth provider, no demo login.
- **Dashboard:** total outstanding, total paid, overdue count and amount, client count, and
  recent invoices. Stat cards animate subtly on scroll (GSAP + ScrollTrigger); the
  animation is skipped entirely when `prefers-reduced-motion` is set, and content is
  never hidden if JavaScript or GSAP fails.
- **Clients:** list and search, add, edit, and delete (with confirm). Name is required;
  email is validated if given. Deleting a client also deletes its invoices.
- **Invoices:** list, search, and filter by all / paid / unpaid / overdue. Add an invoice by
  choosing a client, an amount over 0, a due date, and a description. Mark paid/unpaid and
  delete (with confirm). Overdue is derived: unpaid and past its due date — a paid invoice
  is never overdue.
- **Export and print:** export the currently filtered invoices as a real CSV download, and
  print the invoice list with `window.print` (forms and navigation are hidden in print).
- **Demo data:** when a new account is created, three labelled demo clients and five demo
  invoices are seeded for that account only, so every feature is visible immediately. Use
  **Reset demo data** on the Dashboard to restore them for your account. Demo dates are
  generated relative to today, so there is always an overdue example. Demo data is never
  shared between accounts.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
cp .env.example .env
# Edit .env: set DATABASE_URL (SQLite file, default file:./dev.db is fine locally)
# and AUTH_SECRET to a long random string. Never commit .env.
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000, sign up, and log in.

Other commands:

```bash
npm test        # Vitest unit tests
npm run lint    # ESLint
npm run typecheck  # tsc --noEmit
npm run build   # production build
npm start       # run the production build
```

## Architecture

- **Next.js App Router + TypeScript (strict), React, plain CSS only** (`src/app/globals.css`).
  GSAP is the only animation dependency. No Tailwind, no component libraries.
- **Database:** Prisma + SQLite locally (`prisma/schema.prisma`, migrations committed under
  `prisma/migrations/`). Portable types only (String ids, DateTime, Float), so switching
  the provider to Postgres later is plausible — Postgres has **not** been tested.
- **Auth:** `src/lib/auth.ts` (scrypt hashing, HMAC-signed session cookies),
  `src/lib/session-cookie.ts`, `src/middleware.ts` (cookie-presence check; every API
  handler and server page re-verifies the session and the user). Sessions expire after
  7 days and are deleted on logout.
- **Data access:** `src/lib/data.ts` — every Client/Invoice query filters by the
  logged-in `userId`. Client components never trust a client-side user id; server
  actions/route handlers re-check the session.
- **Pages:** server components (`src/app/page.tsx`, `src/app/clients/page.tsx`,
  `src/app/invoices/page.tsx`) fetch the logged-in user's data and render client
  components (`src/components/*Client.tsx`) that call the `/api/*` routes.
  `/login` and `/signup` are public; `/`, `/clients`, `/invoices` redirect to `/login`
  when there is no valid session.
- **Pure logic in `src/lib/`** — no DOM, no React, so it is directly unit-tested:
  - `types.ts` — Client, Invoice, Totals types.
  - `invoices.ts` — overdue detection, totals, client/invoice search and filtering,
    sorting, money formatting, and seed demo data.
  - `csv.ts` — CSV generation with proper quoting/escaping.
  - `validation.ts` — client, invoice, and credential validation.
  - `auth.ts` — password hashing/verification and session-cookie signing/verification.
  - `data.ts` — Prisma queries, always scoped by `userId`, plus per-user seeding.
  - `storage.ts` — legacy localStorage parsing helpers, retained only for their unit
    tests. The app no longer stores data in localStorage.
- **Tests:** `src/lib/*.test.ts` — the original 24 tests plus auth tests (hash/verify
  round-trip, wrong password fails, tampered session cookie fails, credential
  validation) and a real Prisma isolation test against a temporary SQLite file
  proving user A cannot see, edit, or delete user B's clients/invoices. No fabricated
  tests: every test asserts real behaviour of real code.
- **CI:** `.github/workflows/ci.yml` sets a test file `DATABASE_URL` and a dummy
  test-only `AUTH_SECRET`, runs `prisma migrate deploy`, then lint, typecheck, tests,
  and build on Node 20 and 22 for pushes to `main` and pull requests.

## Honest limits — please read

- **SQLite is local-only.** The SQLite file does not persist on Vercel (ephemeral
  filesystem). Production needs Postgres: set `DATABASE_URL` to a Postgres URL,
  change `provider` in `prisma/schema.prisma` to `postgresql`, set a real `AUTH_SECRET`,
  and run `prisma migrate deploy`. That setup is documented here, **not** tested or
  claimed — do not deploy to Vercel with the SQLite file and expect data to persist.
- **No payments.** Invoices record amounts and status only; no payment processing.
- **No password reset / email verification yet.** Accounts are email + password only.
- **No screenshots.** Screenshot tooling (Playwright/Chromium) was not available in the
  build environment, and no image was faked. Add real screenshots to
  `docs/screenshots/` after deploying and reference them here.

## Deployment (Vercel, Postgres required)

1. Provision a Postgres database (for example Vercel Postgres, Neon, or Supabase) and
   run `prisma migrate deploy` against it from a machine with `DATABASE_URL` set, or
   let the first deploy run it — verify the tables exist before relying on the app.
2. Push this repository to GitHub.
3. In Vercel, **Add New → Project → Import** the repository. Framework preset:
   **Next.js**. Build command: `npm run build`.
4. Environment variables (required): `DATABASE_URL` (Postgres URL) and `AUTH_SECRET`
   (long random string). There are no other secrets.
5. Deploy. Verify the live URL redirects `/` to `/login` when logged out, sign up with
   a new account, add a client and an invoice, reload, and confirm both persist.

This deployment was not run from this workspace; the production build and routes were
verified locally only (see “Verified locally” below).

## Roadmap

- [x] Sign-in and per-user accounts with Prisma + SQLite (this version).
- [ ] Postgres deployment verified end-to-end (see limits above).
- [ ] Password reset and email verification.
- [ ] Invoice PDF export and email sending.
- [ ] Recurring invoices and client payment history.

## Verified locally

On 2026-10-29, from this directory: `npm run lint`, `npm run typecheck`,
`npm test`, and `npm run build` were run after the auth/database changes, and a
production server was exercised with curl (logged-out `/` redirect, `/login` and
`/signup` pages, signup → login → authenticated dashboard → logout flow). Re-run
those commands after any change. No browser end-to-end test was run.

## License

MIT — see [LICENSE](LICENSE).
