import 'server-only'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from './schema'

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>

const g = globalThis as unknown as { __booktabibDb?: Promise<DB> }

/**
 * The app database. In production DATABASE_URL points at Neon. Without it (local
 * development) an embedded Postgres (PGlite) in .pglite/ is used, migrated and
 * filled with demo data automatically.
 */
export function getDb(): Promise<DB> {
  g.__booktabibDb ??= connect()
  return g.__booktabibDb
}

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL
  if (url) {
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    return drizzle(neon(url), { schema }) as unknown as DB
  }

  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_LOCAL_DB) {
    throw new Error('DATABASE_URL is not set. Connect a Neon database (see README).')
  }

  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  const db = drizzle(new PGlite(process.env.PGLITE_DIR ?? '.pglite'), { schema })
  await migrate(db, { migrationsFolder: 'db/migrations' })
  const { seedDemo } = await import('./seed')
  await seedDemo(db as unknown as DB)
  return db as unknown as DB
}
