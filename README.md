# ClientDesk

I built this because I kept losing track of freelance work in spreadsheets. ClientDesk
is a small client and invoice manager: you sign up, add clients, add invoices, and see
at a glance what is paid, unpaid, and overdue. Each account only sees its own data.

I am Muhammad Ahmad, a web developer in Rawalpindi / Islamabad, open to remote work.
muhammadahmad.codes@gmail.com

## What it does

Sign up and log in with an email and password (at least 8 characters). Passwords are
hashed with scrypt, sessions live in the database and are sent as an httpOnly cookie.
There is no OAuth and no demo login.

The dashboard shows total outstanding, total paid, how much is overdue, and your recent
invoices. The stat cards fade in a little as you scroll (GSAP + ScrollTrigger). If you
have reduced motion turned on, there is no animation at all, and nothing is hidden if
the animation fails to load.

Clients can be added, edited, searched, and deleted. Deleting a client deletes its
invoices too. A client can also have a short note, which shows under their name.

Invoices can be filtered by paid, unpaid, or overdue, and searched by description or
client. Overdue just means unpaid and past the due date. You can mark an invoice paid
or unpaid, delete it, export the filtered list as CSV, or print the list.

New accounts get three demo clients and five demo invoices so the pages are not empty
when you first log in. The demo dates are set relative to today, so one invoice is
always overdue. "Reset demo data" on the dashboard wipes your clients and invoices and
puts the demo ones back. Careful with that button, it deletes your real entries too.

## Running it

You need Node.js 20+ and npm.

```bash
cp .env.example .env
# Open .env and set AUTH_SECRET to a long random string.
# DATABASE_URL can stay as file:./dev.db while you work locally.
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000 and sign up. Do not commit `.env` or any `.db` file.

```bash
npm test         # unit tests
npm run lint
npm run typecheck
npm run build
npm start        # run the production build
```

## How it is put together

Next.js (App Router) and TypeScript, plain CSS, no component library. GSAP is the only
animation dependency.

The database is Prisma with SQLite locally. The schema is in `prisma/schema.prisma` and
the migrations are committed under `prisma/migrations/`. All the client and invoice
queries in `src/lib/data.ts` filter by the logged-in user's id. Pages are server
components that check the session first; the forms call the `/api/*` routes, which
check it again. Middleware only checks that a session cookie exists, it does not
verify it — I did it that way because the Edge runtime cannot run the crypto code,
and the real check happens on the server. That also avoids a loop I hit early on,
where an expired cookie bounced between `/` and `/login`.

The pure logic (totals, overdue dates, search and filtering, CSV, validation) lives
in `src/lib/` with tests next to it. There is also a test that uses a throwaway
SQLite database to check that one user cannot see or delete another user's data.

CI runs on pushes to `main` and on pull requests: migrate, lint, typecheck, test,
build, on Node 20 and 22. The secrets in the workflow file are dummy values for
tests only.

## Things that are still rough

SQLite does not persist on Vercel, so this is local-only as it stands. For
production you need Postgres: point `DATABASE_URL` at a Postgres database, change
`provider` in `prisma/schema.prisma` to `postgresql`, set a real `AUTH_SECRET`, and
run `prisma migrate deploy`. I have not tried that setup end to end yet, so I am not
claiming it works — the steps are in the deployment section below, untested.

There is no password reset and no email verification yet. No payments either, invoices
just record amounts and status. I also have no screenshots: there was no browser
available where I built this, so I did not fake any. Screenshots go in
`docs/screenshots/` once the app is deployed.

## Deploying to Vercel (Postgres required)

1. Get a Postgres database (Vercel Postgres, Neon, or Supabase) and run
   `prisma migrate deploy` against it, with `DATABASE_URL` set, from your own
   machine. Check the tables are there before you rely on it.
2. Push the repo to GitHub.
3. In Vercel, add a new project and import the repo. Framework preset: Next.js.
   Build command: `npm run build`.
4. Set two environment variables: `DATABASE_URL` (the Postgres URL) and
   `AUTH_SECRET` (a long random string).
5. Deploy, then check it yourself: logged out, `/` should send you to `/login`.
   Sign up, add a client and an invoice, reload, and make sure both are still there.

I only verified the production build locally, with curl, not on Vercel.

## What I would do next

- Get the Postgres deploy actually working and add screenshots from it.
- Password reset and email verification.
- Invoice PDF export.
- Recurring invoices and a per-client payment history.

## License

MIT — see [LICENSE](LICENSE).
