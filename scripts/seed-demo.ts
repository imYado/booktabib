// Fills an empty Neon database with demo accounts and bookings, for a preview deployment.
// Usage: DATABASE_URL=... npm run db:seed-demo
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { DB } from '../db'
import * as schema from '../db/schema'
import { DEMO_PASSWORD, seedDemo } from '../db/seed'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

seedDemo(drizzle(neon(url), { schema }) as unknown as DB).then(
  () => console.log(`Demo data ready. Demo accounts use the password "${DEMO_PASSWORD}".`),
  (err) => {
    console.error(err)
    process.exit(1)
  },
)
