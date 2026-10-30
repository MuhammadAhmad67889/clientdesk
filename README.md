# ClientDesk

I kept losing track of freelance work in spreadsheets. Who owed what, what was
already paid, what was overdue — it was all over the place. So I built this
for myself, and kept it small on purpose.

ClientDesk is a client and invoice manager. You sign up, add your clients,
add invoices, and you can see at a glance what is paid, unpaid, and overdue.
Each account only sees its own stuff. That's it, really.

I'm Muhammad Ahmad, a web developer in Rawalpindi / Islamabad, open to
remote work. muhammadahmad.codes@gmail.com

Built in October 2026, mostly with Next.js and TypeScript. I was learning
Prisma and auth as I went, so some parts are cleaner than others.

## What you can do

Sign up with an email and a password (8 characters minimum). Passwords are
hashed, sessions are stored in the database and sent back as an httpOnly
cookie. No Google login or anything like that, and no demo account — you
have to make your own.

On the dashboard you get your totals: outstanding, paid, overdue, and your
recent invoices. The stat cards fade in a bit as you scroll. I used GSAP
for that. Turn on reduced motion and it just doesn't animate. If GSAP
fails to load, nothing disappears, the page still works.

Add clients, edit them, search them, delete them. If you delete a client,
their invoices go too. You can leave a short note on a client and it shows
under their name.

Invoices can be filtered by paid, unpaid, or overdue, and searched by
description or client name. Overdue just means unpaid and past the due
date, nothing clever. Mark an invoice paid or unpaid, delete it, export
the filtered list as a CSV, or print it.

When you first sign up you get three demo clients and five demo invoices,
so the pages aren't empty. The dates are set relative to today, so one of
them is always overdue. There is a "Reset demo data" button on the
dashboard. It wipes your clients and invoices and puts the demo ones back,
so be careful with it if you have real entries in there.

## How to run it

You need Node 20+ and npm, and Postgres running locally.

```bash
cp .env.example .env
# Open .env and put a long random string in AUTH_SECRET.
# DATABASE_URL and DATABASE_URL_UNPOOLED point at your local Postgres.
npm install
npx prisma migrate dev
npm run dev
```

Go to http://localhost:3000 and sign up. Don't commit `.env` — it's
ignored for a reason.

```bash
npm test         # unit tests
npm run lint
npm run typecheck
npm run build
npm start        # runs the production build
```

## How it's put together

Next.js with the App Router, TypeScript, plain CSS. I didn't use a
component library. GSAP is the only animation dependency.

The database is Prisma with Postgres, locally and in production. The schema is in
`prisma/schema.prisma`, migrations are in `prisma/migrations/`. Every
client and invoice query in `src/lib/data.ts` filters by the logged-in
user's id, so accounts can't see each other's data.

Pages are server components that check the session first, and the forms
call the `/api/*` routes, which check it again. Middleware only checks
that a session cookie exists — it doesn't verify it. I did it that way
because the Edge runtime can't run the crypto code, and the real check
happens on the server anyway. It also fixed a loop I ran into early on,
where an expired cookie kept bouncing between `/` and `/login`.

The maths and filtering stuff — totals, overdue dates, search, CSV,
validation — is in `src/lib/` with tests next to it. There's one test
that spins up a throwaway Postgres database and checks that one user
can't see or delete another user's data. That one took me a while.

CI runs when I push to `main` or open a pull request: migrate, lint,
typecheck, test, build, on Node 20 and 22. The secrets in the workflow
file are dummy values just for the tests.

## What's still rough

No password reset by email yet, and no email verification — that
needs an email service, which I haven't added. If you're signed in,
you can change your password from Settings instead, and it signs you
out on your other devices. No payments either — invoices just record
amounts and whether they're paid. There are no projects, tasks,
messages, or reports pages, and no file attachments — I didn't invent
those, so the sidebar only lists Overview, Clients, Invoices, and
Settings.

## Design (October 2026 redesign)

A premium, restrained redesign on the same code: Inter type, an 8px
spacing system, navy/blue tokens with light and dark modes (saved per
browser), a collapsible sidebar, a Ctrl/Cmd+K command palette that
searches real clients and invoices, sorted client/invoice lists, a
dashboard "needs your attention" section for overdue invoices, and
card layouts on mobile instead of sideways-scrolling tables. No
features were removed and no backend or schema changes were made;
every number on the dashboard still comes from your real data.

No screenshots yet. There was no browser available where I built this,
so I didn't fake any. I'll add real ones to `docs/screenshots/` once
it's deployed.

## Deploying to Vercel (Postgres)

1. Get a Postgres database. I used a free Neon database from Vercel
   Storage (`clientdesk-postgres`, Singapore region).
2. Push the repo to GitHub.
3. In Vercel, add a new project and import the repo. Framework preset:
   Next.js. The build command (`npm run build`) runs
   `prisma migrate deploy` first, so the tables get created on deploy.
4. Connect the database to the project in Vercel Storage, so
   `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are set automatically.
   Then set `AUTH_SECRET` (a long random string, different from your
   local one) in the project settings.
5. Deploy, then check it yourself: logged out, `/` should send you to
   `/login`. Sign up, add a client and an invoice, reload, and make
   sure both are still there.

## What I'd do next

- Add screenshots from the deployed app (the ones I captured earlier
  show the old design, so they need re-capturing first).
- Password reset by email, once there's an email service.
- Recurring invoices, and a payment history per client.

## Features added 30 October 2026

I kept building on the same app instead of starting over:

- Client pages: click a client to see their contact details, totals,
  and all their invoices.
- Invoice pages: open an invoice to see it on its own, mark it paid
  or unpaid, delete it, or print it — printing and choosing "Save as
  PDF" in your browser is how you get a PDF. There's no PDF library
  in the project, and I didn't want to pretend otherwise.
- Settings: change your password while signed in (current password
  checked, other sessions signed out).
- Client CSV import: upload a CSV with a `name` header and optional
  email/company/phone/notes columns. Bad rows are skipped and counted,
  not silently dropped.
- Dashboard: a last-6-months view of paid vs outstanding, from real
  issued dates. No chart library, just bars — and no numbers that
  aren't in the database.

## License

MIT — see [LICENSE](LICENSE).
