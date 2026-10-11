import 'server-only'
import { and, eq, lte, ne } from 'drizzle-orm'
import { getDb } from '@/db'
import { bookings, clinicRatings } from '@/db/schema'
import { todayISO } from './format'

/** Whether a user may rate a clinic: they need a booking there, for today or earlier, that wasn't cancelled. */
export async function canRateClinic(userId: string, clinicId: string) {
  const db = await getDb()
  const [row] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.clinicId, clinicId), ne(bookings.status, 'cancelled'), lte(bookings.date, todayISO())))
    .limit(1)
  return !!row
}

/** The user's own star rating of a clinic, or 0. */
export async function getMyRating(userId: string, clinicId: string) {
  const db = await getDb()
  const [row] = await db
    .select({ stars: clinicRatings.stars })
    .from(clinicRatings)
    .where(and(eq(clinicRatings.userId, userId), eq(clinicRatings.clinicId, clinicId)))
    .limit(1)
  return row?.stars ?? 0
}
