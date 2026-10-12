import 'server-only'
import { and, eq, gte, isNotNull, lte, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { bookings, prescriptions } from '@/db/schema'
import { addDays } from './format'

/** How long finished visits took on each of these days, from Call in to Done, in whole minutes. */
export async function visitLengths(doctorId: string, dates: string[]) {
  const db = await getDb()
  const rows = dates.length
    ? await db
        .select({ date: bookings.date, calledAt: bookings.calledAt, finishedAt: bookings.finishedAt })
        .from(bookings)
        .where(
          and(
            eq(bookings.doctorId, doctorId),
            eq(bookings.status, 'done'),
            isNotNull(bookings.calledAt),
            isNotNull(bookings.finishedAt),
            gte(bookings.date, dates[0]),
            lte(bookings.date, dates[dates.length - 1]),
          ),
        )
    : []
  // A visit left open over lunch or marked done by mistake straight away would skew the average.
  const minutes = rows
    .map((r) => ({ date: r.date, minutes: (r.finishedAt! - r.calledAt!) / 60_000 }))
    .filter((r) => r.minutes >= 1 && r.minutes <= 180)
  const average = (list: number[]) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null)
  return {
    days: dates.map((date) => {
      const list = minutes.filter((r) => r.date === date).map((r) => r.minutes)
      return { date, average: average(list), visits: list.length }
    }),
    average: average(minutes.map((r) => r.minutes)),
    visits: minutes.length,
  }
}

/**
 * Of the patients whose prescription came due in each of the last `weeks` weeks, how many booked again.
 * A return counts when they booked on the account the prescription was added for, or through the
 * renewal link they were sent, so someone coming back on a new account still counts if they used the link.
 */
export async function returnRates(doctorId: string, today: string, weeks = 8) {
  const db = await getDb()
  const from = addDays(today, -7 * weeks + 1)
  const rows = await db
    .select({
      renewOn: prescriptions.renewOn,
      // Written out in full: inside a select, drizzle leaves column names unqualified, which here would mean the booking's.
      returned: sql<boolean>`exists (
        select 1 from ${bookings} b
        where b.doctor_id = prescriptions.doctor_id
          and b.status <> 'cancelled'
          and b.created_at > prescriptions.created_at
          and (b.prescription_id = prescriptions.id or (prescriptions.user_id is not null and b.user_id = prescriptions.user_id))
      )`,
    })
    .from(prescriptions)
    .where(and(eq(prescriptions.doctorId, doctorId), gte(prescriptions.renewOn, from), lte(prescriptions.renewOn, today)))
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(from, 7 * i)
    const end = addDays(start, 6)
    const inWeek = rows.filter((r) => r.renewOn >= start && r.renewOn <= end)
    const returned = inWeek.filter((r) => r.returned).length
    return { start, due: inWeek.length, returned, rate: inWeek.length ? Math.round((100 * returned) / inWeek.length) : null }
  })
  const returned = rows.filter((r) => r.returned).length
  return { weeks: buckets, due: rows.length, returned, rate: rows.length ? Math.round((100 * returned) / rows.length) : null }
}
