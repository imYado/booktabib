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
4. Redeploy. Every deploy runs the database migrations first (`vercel-build` script).
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
| `/clinics/[id]` | Everyone | Clinic profile and its doctors |
| `/doctors/[id]` | Everyone | Doctor profile and appointment request form |
| `/bookings/[id]` | The patient's account, clinic staff | Full booking details |
| `/q/[token]` | Anyone with the link | Patient's live line: name, number, people ahead, estimate, directions, WhatsApp. Nothing else |
| `/login`, `/register` | Everyone | Patients sign up; staff accounts come from an administrator |
| `/account` | Signed in | My bookings, with cancelling |
| `/assistant` | Assistants, admins | Approve or cancel requests, call patients in, pick the clinic's accent colour and doctors' WhatsApp numbers |
| `/doctor` | Doctors, admins | Today's patients, current patient, weekly chart, own WhatsApp number |
| `/screen` | Assistants, admins | Clinic TV showing who is being served, refreshes every 5 seconds |
| `/admin` | Admins | Create staff accounts |

### Data

- **Bookings, accounts and sessions** are in Postgres (`db/schema.ts`), through Drizzle ORM.
  After changing the schema, run `npm run db:generate` and commit the new file in `db/migrations/`.
- **Clinic accent colours and doctor WhatsApp numbers** are in `clinic_settings` and `doctor_settings`.
  The colours are listed in `lib/accents.ts`. An assistant can work for a whole clinic or for one
  doctor in it; a one-doctor assistant only sees that doctor's patients.
- **Clinics and doctors** are still the fictional sample list in `lib/data.ts`. Replace it with real
  clinics when you have them.
- Passwords are hashed with scrypt. Sessions are random tokens in an http-only cookie, stored hashed.
