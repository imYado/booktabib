import 'server-only'
import { createHash } from 'node:crypto'
import { eq, lt, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { getDb } from '@/db'
import { rateLimits } from '@/db/schema'

// Attempt counters kept in the database, so limits hold across every server instance.

const hashed = (key: string) => createHash('sha256').update(key).digest('hex')

/** The visitor's IP address, as reported by Vercel. */
export async function clientIp() {
  const h = await headers()
  return h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

/** Whether `key` has already used its `max` attempts in the current window. */
export async function isLimited(key: string, max: number) {
  const db = await getDb()
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, hashed(key))).limit(1)
  return !!row && row.resetAt > new Date() && row.count >= max
}

/** Counts one attempt for `key`. The count starts over `minutes` after the first attempt. Returns the new count. */
export async function hit(key: string, minutes: number) {
  const db = await getDb()
  const [row] = await db
    .insert(rateLimits)
    .values({ key: hashed(key), count: 1, resetAt: new Date(Date.now() + minutes * 60_000) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.resetAt} <= now() then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} <= now() then excluded.reset_at else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count })
  // Now and then, clear out counters that have run out.
  if (Math.random() < 0.02) await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date()))
  return row.count
}

/** Counts one attempt and says whether it goes over `max` within `minutes`. */
export async function overLimit(key: string, max: number, minutes: number) {
  return (await hit(key, minutes)) > max
}

export async function clearLimit(key: string) {
  const db = await getDb()
  await db.delete(rateLimits).where(eq(rateLimits.key, hashed(key)))
}
