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

## What's here

Next.js (App Router) in English, Arabic and Kurdish Sorani. The language is kept in a cookie and the
whole layout flips to right-to-left for Arabic and Kurdish. Fonts (Archivo, Hanken Grotesk,
Vazirmatn) are self-hosted through `next/font`.

| Path | What it is |
|---|---|
| `/` | Home: search, featured clinics, specialties |
| `/clinics` | Clinic search with city and specialty filters |
| `/clinics/[id]` | Clinic profile and its doctors |
| `/doctors/[id]` | Doctor profile and appointment request form |
| `/bookings/[id]` | Booking confirmation and status |
| `/assistant` | Assistant desk: approve or cancel requests, call patients in |
| `/doctor` | Doctor dashboard: today's patients, current patient, weekly chart |
| `/screen?clinic=…` | Clinic TV screen showing who is being served, refreshes every 5 seconds |

The design tokens and components live in `app/globals.css` and follow the design spec.

**Preview only:** clinics and doctors are fictional sample data (`lib/data.ts`), bookings are held
in memory (`lib/store.ts`) and reset when the server restarts, and the `/assistant` and `/doctor`
pages have no login yet.
