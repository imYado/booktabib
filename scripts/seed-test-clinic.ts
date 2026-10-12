// Adds the test clinic (db/test-clinic.ts) to the Neon database in DATABASE_URL. Does nothing when it's already there.
// Runs on production deploys after the migrations (see vercel-build in package.json), or by hand:
// DATABASE_URL=... npm run db:seed-test-clinic
// A failure is logged but doesn't stop the deploy.
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { DB } from '../db'
import * as schema from '../db/schema'
import { seedTestClinic } from '../db/test-clinic'

const url = process.env.DATABASE_URL
if (!url) {
  console.log('DATABASE_URL is not set; skipping the test clinic.')
  process.exit(0)
}
// Preview deploys of a branch leave it out, so it only appears once the change is merged.
if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
  console.log('Not a production deploy; skipping the test clinic.')
  process.exit(0)
}

seedTestClinic(drizzle(neon(url), { schema }) as unknown as DB).then(
  (added) => console.log(added ? 'Test clinic added.' : 'Test clinic is already there.'),
  (err) => console.error('Could not add the test clinic:', err),
)
