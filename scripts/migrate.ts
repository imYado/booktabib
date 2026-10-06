// Applies database migrations to the Neon database in DATABASE_URL.
// Runs on every Vercel deploy (see the vercel-build script in package.json).
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'

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
