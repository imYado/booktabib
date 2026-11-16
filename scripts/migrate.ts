// Applies database migrations to the Neon database in DATABASE_URL.
// Runs on every Vercel deploy (see the vercel-build script in package.json), but only the production
// deploy changes the database: preview deploys of pull requests share the live database, so running
// a pull request's migrations there would change live clinics before the pull request is merged.
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'

if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' && !process.env.MIGRATE_PREVIEW) {
  console.log(`Skipping database migrations on this ${process.env.VERCEL_ENV} deploy; they run when it reaches production.`)
  process.exit(0)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Connect a Neon database to the Vercel project first.')
  process.exit(1)
}

migrate(drizzle(neon(url)), { migrationsFolder: 'db/migrations' }).then(
  () => console.log('Database migrations applied.'),
  (err) => {
    console.error(err)
    process.exit(1)
  },
)
