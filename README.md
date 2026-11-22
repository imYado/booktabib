# booktabib

Clinics, doctors, and care—discover your options and book instantly!

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
npm run typecheck
```

Locally no database setup is needed: without `DATABASE_URL` the app uses an embedded Postgres
(PGlite) stored in `.pglite/`, and fills it with demo data the first time it starts. Delete
`.pglite/` to start over. Demo accounts all use the password `booktabib-demo`:

| Email | Role |
|---|---|
| `admin@example.com` | Administrator |
| `assistant@example.com` | Assistant at Shifa Family Clinic |
| `doctor@example.com` | Dr. Sara Ahmed |
| `patient@example.com` | Patient |

## Putting it online (Vercel + Neon)

1. Import this repository at [vercel.com/new](https://vercel.com/new). Vercel detects Next.js.
2. In the Vercel project, open **Storage**, add **Neon Postgres** and connect it to the project.
   This sets `DATABASE_URL`.
3. In **Settings → Environment Variables**, add `ADMIN_EMAIL` with the email you will use as
   administrator, and `ADMIN_SETUP_CODE` with a long random secret (at least 12 characters) that
   only you know.
4. Redeploy. Every production deploy runs the database migrations first (`vercel-build` script).
   Preview deploys of pull requests skip them, because previews use the same live database; set
   `MIGRATE_PREVIEW=1` on a preview that has its own database to run them there.
5. Open `/register?setup=1` on the site, sign up with your `ADMIN_EMAIL` and the setup code, and you
   land on the **Staff** page, where you create accounts for clinic assistants and doctors.
   Nobody can register `ADMIN_EMAIL` without the code, and a wrong code gives no account.

A production database starts empty. To fill a preview database with the demo accounts and
bookings, run `DATABASE_URL=... npm run db:seed-demo` once.

## What's here

Next.js (App Router) in English, Arabic and Kurdish Sorani. The language is kept in a cookie and the
whole layout flips to right-to-left for Arabic and Kurdish. Fonts (Archivo, Hanken Grotesk,
Vazirmatn) are self-hosted through `next/font`. The design tokens and components live in
`app/globals.css` and follow the design spec.

| Path | Who | What it is |
|---|---|---|
| `/` | Everyone | Home: search, featured clinics, specialties |
| `/clinics` | Everyone | Clinic search with city and specialty filters |
| `/clinics/[id]` | Everyone | Clinic profile: its doctors (one doctor is shown up front with a Book button), photo gallery, "Good to know" facts, opening hours and a map with directions |
| `/doctors/[id]` | Everyone | Doctor profile and appointment request form |
| `/bookings/[id]` | The patient's account, clinic staff | Full booking details |
| `/q/[token]` | Anyone with the link | Patient's live line: name, number, people ahead, estimate, directions, WhatsApp. Nothing else |
| `/login`, `/register` | Everyone | Patients sign up; staff accounts come from an administrator |
| `/account` | Signed in | My bookings, with cancelling |
| `/assistant` | Assistants, admins | Assistant desk, today's queue: call patients in, reorder the line, add walk-ins |
| `/assistant/requests` | Assistants, admins | Approve or cancel appointment requests |
| `/assistant/renewals` | Assistants, admins | Prescription renewals (patients are reminded by site notifications only) |
| `/assistant/settings` | Assistants, admins | The clinic's accent colour, who picks booking times (patients, or the assistant), TV screen language, doctors' WhatsApp numbers and visit lengths |
| `/doctor` | Doctors, admins | Today's patients, current patient, weekly chart, own WhatsApp number |
| `/screen` | Assistants, admins | Clinic TV showing who is being served, refreshes every 5 seconds |
| `/admin` | Admins | Create staff accounts |

### Data

- **Bookings, accounts and sessions** are in Postgres (`db/schema.ts`), through Drizzle ORM.
  After changing the schema, run `npm run db:generate` and commit the new file in `db/migrations/`.
  A migration runs once, on the live database. It should not overwrite clinic or doctor details
  that administrators can edit on the site, or their edits are lost.
- **Clinic accent colours and doctor WhatsApp numbers** are in `clinic_settings` and `doctor_settings`.
  The colours are listed in `lib/accents.ts`. An assistant can work for a whole clinic or for one
  doctor in it; a one-doctor assistant only sees that doctor's patients.
- **Clinics and doctors** are still the fictional sample list in `lib/data.ts`. Replace it with real
  clinics when you have them.
- **Assistant-picked times.** A clinic can switch "Booking times" to "The assistant picks the day and
  time" in its desk settings. Patients then only send a request, saved as `unscheduled` and kept out of
  every line and slot. On the Requests page an assistant gives it a day and time, which approves it, or
  presses "Pending date" (`date_pending`) to accept it now and set the day later.
- Passwords are hashed with scrypt. Sessions are random tokens in an http-only cookie, stored hashed.
