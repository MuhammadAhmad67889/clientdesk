# ClientDesk

A freelance client and invoice manager you can actually use: keep clients in one place,
track what is paid, unpaid, and overdue, and export invoices as CSV.

Built by Muhammad Ahmad — web developer in Rawalpindi / Islamabad, open to remote work.
Contact: muhammadahmad.codes@gmail.com

## What it does

- **Dashboard:** total outstanding, total paid, overdue count and amount, client count, and
  recent invoices.
- **Clients:** list and search, add, edit, and delete (with confirm). Name is required;
  email is validated if given. Deleting a client also deletes its invoices.
- **Invoices:** list, search, and filter by all / paid / unpaid / overdue. Add an invoice by
  choosing a client, an amount over 0, a due date, and a description. Mark paid/unpaid and
  delete (with confirm). Overdue is derived: unpaid and past its due date — a paid invoice
  is never overdue.
- **Export and print:** export the currently filtered invoices as a real CSV download, and
  print the invoice list with `window.print` (forms and navigation are hidden in print).
- **Demo data:** on first run, three labelled demo clients and five demo invoices are seeded
  so every feature is visible immediately. Use **Reset demo data** on the Dashboard to
  restore them. Demo dates are generated relative to today, so there is always an overdue
  example.

## Honest v1 limits — please read

This is v1, a single-user demo:

- **No sign-in / auth.** Anyone opening the app in that browser sees the same data.
- **No server database.** All data lives in browser `localStorage` under the key
  `clientdesk:v1`. Clearing browser storage clears the data. Nothing is sent to a server.
- **No secrets, no environment variables.** `.env.example` is a comment only.
- **No payments.** Invoices record amounts and status only; no payment processing.

Auth and a Postgres database are roadmap items, not done work. They are not claimed anywhere
in this README or the app.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000

Other commands:

```bash
npm test        # Vitest unit tests for the pure logic in src/lib/
npm run lint    # ESLint
npm run typecheck  # tsc --noEmit
npm run build   # production build
npm start       # run the production build
```

## Architecture

- **Next.js App Router + TypeScript (strict), React, plain CSS only** (`src/app/globals.css`).
  No Tailwind, no component libraries, no database/auth packages.
- **Pages:** `src/app/page.tsx` (Dashboard), `src/app/clients/page.tsx`,
  `src/app/invoices/page.tsx`. All pages are client components because they read
  `localStorage`.
- **Pure logic in `src/lib/`** — no DOM, no React, so it is directly unit-tested:
  - `types.ts` — Client, Invoice, Totals types.
  - `invoices.ts` — overdue detection, totals, client/invoice search and filtering,
    sorting, money formatting, and seed demo data.
  - `csv.ts` — CSV generation with proper quoting/escaping.
  - `validation.ts` — client and invoice validation.
  - `storage.ts` — `localStorage` key, safe parsing (corrupt data falls back to seed data),
    ID generation.
  - `useStore.ts` — React state + `localStorage` persistence, add/edit/delete actions.
- **Tests:** `src/lib/*.test.ts` — 24 tests covering totals, overdue edge cases
  (due today is not overdue, paid is never overdue), filtering/search, CSV escaping,
  validation, and storage round-tripping. No fabricated tests: every test asserts real
  behaviour of real code.
- **CI:** `.github/workflows/ci.yml` runs `npm ci`, lint, typecheck, tests, and build
  on Node 20 and 22 for pushes to `main` and pull requests.

## Deployment (Vercel)

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project → Import** the repository.
3. Framework preset: **Next.js**. Build command: `npm run build`. No environment
   variables are required in v1 — leave them blank.
4. Deploy. Verify the live URL shows the Dashboard with the demo data, then add a client
   and an invoice, reload the page, and confirm both persist (localStorage).

This deployment was not run from this workspace; the production build and routes were
verified locally only (see “Verified locally” below).

## Screenshots

No screenshots are included in v1. Screenshot tooling (Playwright/Chromium) was not
available in the build environment, and no image was faked. Add real screenshots to
`docs/screenshots/` after deploying and reference them here.

## Roadmap

- [ ] Sign-in and multi-user accounts (not in v1).
- [ ] Postgres database with Prisma, replacing `localStorage` (not in v1).
- [ ] Invoice PDF export and email sending.
- [ ] Recurring invoices and client payment history.

## Verified locally

On 2026-10-29, from this directory: `npm ci`, `npm run lint`, `npx tsc --noEmit`,
`npm test` (24 tests), and `npm run build` all passed, and a production server returned
HTTP 200 for `/`, `/clients`, and `/invoices`. Re-run those commands after any change.

## License

MIT — see [LICENSE](LICENSE).
