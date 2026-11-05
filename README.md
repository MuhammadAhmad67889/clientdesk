# ClientDesk

I kept losing track of freelance work in spreadsheets. Who owed what, what was
already paid, what was overdue — it was all over the place. So I built this
for myself, and kept it small on purpose.

ClientDesk is a small SaaS for freelancers: a client and invoice
manager with accounts, plans, and a public site. You sign up, add your
clients, add invoices, and you can see at a glance what is paid,
unpaid, and overdue. Each account only sees its own stuff. That's it,
really.

Visitors who aren't signed in see a landing page, a pricing page
(Free $0, Pro $9/month, Business $19/month), and plain-language terms
and privacy pages. Signing up starts you on Free with an onboarding
checklist on the dashboard: add a client, create an invoice, record a
payment. The demo data that comes with a new account already covers
the first two, and the checklist says so.

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
recent invoices. The overdue and outstanding figures use what's actually
left after part-payments, not the full invoice amounts. The stat cards fade in a bit as you scroll. I used GSAP
for that. Turn on reduced motion and it just doesn't animate. If GSAP
fails to load, nothing disappears, the page still works.

Add clients, edit them, search them, delete them. If you delete a client,
their invoices go too. You can leave a short note on a client and it shows
under their name.

Invoices can be filtered by paid, unpaid, or overdue, and by a due-date
range, and searched by description or client name. Overdue just means
unpaid and past the due date, nothing clever. Mark an invoice paid or
unpaid, edit it, duplicate it for a repeat job, delete it, export the
filtered list as a CSV, print it, or download a real PDF of it.

Invoices have numbers (INV-001, INV-002, and so on) and can carry a
discount and a tax rate — discount comes off first, then tax is worked
out on what's left. You can set a business name in Settings and it
shows on the invoice page and the PDF. Invoices can also repeat
monthly: set one up once, then press "Generate due now" when it's due
and it makes one invoice and moves the next date a month on. Nothing
runs in the background.

Part-payments work too. Record what a client actually paid and when,
and the invoice shows paid so far and what's left. When the payments
reach the total it flips to paid by itself. Recorded a payment by
mistake? Delete it and the balance comes back. The invoices CSV
includes paid and balance columns, and each client's page and row in
the clients list show their outstanding balance.

When you first sign up you get three demo clients and five demo invoices,
so the pages aren't empty. The dates are set relative to today, so one of
them is always overdue. There is a "Reset demo data" button on the
dashboard. It wipes your clients and invoices and puts the demo ones back,
so be careful with it if you have real entries in there.

### Draft helpers (rule-based, not AI)

Three small helpers that draft things from your real data — every figure
in them comes from an invoice or a payment you already recorded, and
nothing they produce is saved until you confirm it:

- **Draft invoice from text** (Invoices → "Draft an invoice from
  text"): paste something like "Website work for Acme Studio, total
  $1200, due 2026-12-01" and it fills in the client, amount, and due
  date. The rules are simple on purpose: the largest $-marked amount,
  a YYYY-MM-DD or DD/MM/YYYY date, the longest client name found in
  the text. Anything it misses stays empty for you to fill in.
- **Reminder draft** on each unpaid invoice's page: a fixed template
  with that invoice's total, paid so far, balance, and days overdue.
  There is no send button — ClientDesk has no email service yet — so
  you copy it into your own email.
- **Dashboard summaries**: this month's billed, paid, and outstanding
  totals (plain arithmetic, no forecast), and a "largest outstanding
  balances" list that is a sort by outstanding amount, largest first —
  not a risk prediction.

### Plans and billing

Free allows 10 clients and 30 invoices (demo data counts toward both).
Pro and Business are unlimited. The billing code is built — Stripe
checkout, a signature-checked webhook that flips your plan, and a
customer portal for managing or cancelling — but it is **not switched
on yet**: Stripe isn't connected, so every account is on Free and the
Settings billing section says so plainly. No real money moves until
test-mode billing is switched on deliberately, and live payments are a
separate decision after that.

### Security and your data

Every response carries security headers, and cross-site mutation
requests to the API are rejected (the Stripe webhook is the one
exception, verified by signature). Password changes are rate-limited,
and `/api/health` reports whether the database answers, for uptime
monitoring. In Settings you can export everything in your account as
one JSON file — passwords, sessions and reset tokens are never
included — delete your whole account by typing your own email address
to confirm, and see a recent activity log of your own changes.

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
call the `/api/*` routes, which check it again. Middleware rejects
cross-site mutation requests to `/api/*` (a browser sending an Origin
from another site), except the Stripe webhook, which Stripe's servers
post to and which is verified by signature instead. Session cookies
are verified on the server, not in middleware, because the Edge
runtime can't run the crypto code.

The maths and filtering stuff — totals, overdue dates, search, CSV,
validation — is in `src/lib/` with tests next to it. There's one test
that spins up a throwaway Postgres database and checks that one user
can't see or delete another user's data. That one took me a while.

CI runs when I push to `main` or open a pull request: migrate, lint,
typecheck, test, build, on Node 20 and 22. The secrets in the workflow
file are dummy values just for the tests.

## What's still rough

No email verification yet, and password reset by email is built but
not switched on — it needs an email service, which I haven't
configured. If you're signed in, you can change your password from
Settings instead, and it signs you out on your other devices. Billing
is built but not switched on (see Plans and billing above). There are
no projects, tasks, messages, or reports pages, and no file
attachments — I didn't invent those, so the sidebar lists Overview,
Clients, Invoices, Payments, Analytics, and Settings.

## Screenshots

These are real screenshots of the deployed app, taken 4 November 2026
with the seeded demo data (not a real customer's data). They show the
current interface: dashboard with revenue trend and recent activity,
clients, invoices, and an invoice detail page with line items and
payment history.

![Dashboard](docs/screenshots/dashboard.png)
![Clients](docs/screenshots/clients.png)
![Invoices](docs/screenshots/invoices.png)
![Invoice detail](docs/screenshots/invoice-detail.png)

## How I verified this

CI runs on every push to `main`: migrate, lint, typecheck, test, and
build on Node 20 and 22. The live checks I actually did: logged out,
`/` sends you to `/login`; signed up, added a client and an invoice,
reloaded, and both were still there.

The screenshots above are real shots of the deployed app with seeded
demo data, taken 4 November 2026 — not a real customer's data. They show
the current interface, including the revenue trend, recent activity,
line items, and payment history.

Data cleanup, 1 November 2026: the live database had picked up six
throwaway test accounts from verification and screenshot work (19
clients, 31 invoices between them). I deleted those six accounts;
their clients and invoices went with them. One other account that
signed up on 29 October was left alone, because I couldn't confirm it
was a test account. After the delete I re-checked: 1 account, 3
clients, and 5 invoices remained, and the live site still sends
logged-out visitors to `/login`.

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

- Switch on Stripe billing in test mode, then try a demo payment with a test card.
- Password reset by email, once there's an email service.
- Draft helpers that use a real language model (needs an API key) — the rule-based drafts above are the fallback if there's no key.

## Features added 30 October 2026

I kept building on the same app instead of starting over:

- Client pages: click a client to see their contact details, totals,
  and all their invoices.
- Invoice pages: open an invoice to see it on its own, mark it paid
  or unpaid, delete it, or print it — printing and choosing "Save as
  PDF" in your browser is how you got a PDF back then. A real
  server-generated PDF download came later.
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
