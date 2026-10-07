import 'server-only'
import { and, asc, desc, eq, gte, inArray, ne, sql, type SQL } from 'drizzle-orm'
import { getDb } from '@/db'
import { bookings, type Booking, type BookingStatus } from '@/db/schema'
import { getCatalog } from './catalog'
import { dailySlots, isWorkingDay } from './data'
import { CLINIC_TIME_ZONE, todayISO } from './format'
import { randomId } from './ids'

export type { Booking, BookingStatus }

export class SlotTakenError extends Error {}

function isUniqueViolation(err: unknown): boolean {
  for (let e = err as { code?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.code === '23505') return true
  }
  return false
}

type Filter = {
  clinicId?: string
  doctorId?: string
  userId?: string
  date?: string
  fromDate?: string
  status?: BookingStatus | BookingStatus[]
}

export async function listBookings(filter: Filter = {}): Promise<Booking[]> {
  const where: SQL[] = []
  if (filter.clinicId) where.push(eq(bookings.clinicId, filter.clinicId))
  if (filter.doctorId) where.push(eq(bookings.doctorId, filter.doctorId))
  if (filter.userId) where.push(eq(bookings.userId, filter.userId))
  if (filter.date) where.push(eq(bookings.date, filter.date))
  if (filter.fromDate) where.push(gte(bookings.date, filter.fromDate))
  if (filter.status) {
    where.push(Array.isArray(filter.status) ? inArray(bookings.status, filter.status) : eq(bookings.status, filter.status))
  }
  const db = await getDb()
  return db
    .select()
    .from(bookings)
    .where(and(...where))
    .orderBy(asc(bookings.date), asc(queueKeySql), asc(bookings.time), asc(bookings.ticket))
}

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Where a booking sits in its day's line: where an assistant dragged it, else its own time. */
export function queueKey(b: Pick<Booking, 'position' | 'time'>) {
  return b.position ?? minutes(b.time)
}

const queueKeySql = sql`coalesce(${bookings.position}, split_part(${bookings.time}, ':', 1)::int * 60 + split_part(${bookings.time}, ':', 2)::int)`

export async function getBooking(id: string): Promise<Booking | undefined> {
  const db = await getDb()
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1)
  return row
}

function nowHHMM() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(),
  )
}

/** Slots on a given day that are still free for a doctor. */
export async function openSlots(doctorId: string, date: string): Promise<string[]> {
  if (!isWorkingDay(date)) return []
  const db = await getDb()
  const taken = await db
    .select({ time: bookings.time })
    .from(bookings)
    .where(and(eq(bookings.doctorId, doctorId), eq(bookings.date, date), ne(bookings.status, 'cancelled')))
  const takenSet = new Set(taken.map((b) => b.time))
  const now = date === todayISO() ? nowHHMM() : ''
  return dailySlots.filter((t) => !takenSet.has(t) && t > now)
}

export async function createBooking(input: {
  doctorId: string
  date: string
  time: string
  patientName: string
  phone: string
  note: string
  userId: string | null
}): Promise<Booking> {
  const doctor = (await getCatalog()).getDoctor(input.doctorId)
  if (!doctor) throw new Error('Unknown doctor')
  if (!(await openSlots(doctor.id, input.date)).includes(input.time)) throw new SlotTakenError()
  const db = await getDb()
  try {
    const [row] = await db
      .insert(bookings)
      .values({ ...input, id: randomId(10, 'BT'), clinicId: doctor.clinicId })
      .returning()
    return row
  } catch (err) {
    // Someone else booked the same slot a moment earlier.
    if (isUniqueViolation(err)) throw new SlotTakenError()
    throw err
  }
}

/** Gives an approved booking the next ticket number for its clinic and day. */
async function assignTicket(booking: Booking) {
  const db = await getDb()
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await db
        .update(bookings)
        .set({
          ticket: sql`(select coalesce(max(${bookings.ticket}), 0) + 1 from ${bookings} where ${bookings.clinicId} = ${booking.clinicId} and ${bookings.date} = ${booking.date})`,
        })
        .where(and(eq(bookings.id, booking.id), sql`${bookings.ticket} is null`))
      return
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
    }
  }
  throw new Error('Could not assign a ticket number')
}

export async function setStatus(booking: Booking, status: BookingStatus) {
  const db = await getDb()
  if (booking.status === 'cancelled' && status !== 'cancelled' && !booking.walkIn) {
    // Bringing a removed patient back: if someone else has their slot by now, they come back as a walk-in.
    try {
      await db.update(bookings).set({ status: 'pending' }).where(eq(bookings.id, booking.id))
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      await db.update(bookings).set({ walkIn: true }).where(eq(bookings.id, booking.id))
    }
  }
  if ((status === 'approved' || status === 'in_progress') && booking.ticket === null) await assignTicket(booking)
  if (status === 'in_progress') {
    // A doctor sees one patient at a time: whoever was with them is finished.
    await db
      .update(bookings)
      .set({ status: 'done' })
      .where(and(eq(bookings.doctorId, booking.doctorId), eq(bookings.status, 'in_progress'), ne(bookings.id, booking.id)))
  }
  await db
    .update(bookings)
    .set({ status, ...(status === 'in_progress' ? { calledAt: Date.now() } : {}) })
    .where(eq(bookings.id, booking.id))
}

/** The patients currently with a doctor at a clinic today, most recently called first. */
export async function nowServing(clinicId: string, date: string) {
  const db = await getDb()
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.clinicId, clinicId), eq(bookings.date, date), eq(bookings.status, 'in_progress')))
    .orderBy(desc(bookings.calledAt))
}

export async function getBookingByLiveToken(token: string): Promise<Booking | undefined> {
  if (!/^[0-9a-f]{64}$/.test(token)) return undefined
  const db = await getDb()
  const [row] = await db.select().from(bookings).where(eq(bookings.liveToken, token)).limit(1)
  return row
}

/** Where a booking stands in its doctor's line today. */
export async function queuePosition(booking: Booking) {
  const line = await listBookings({ doctorId: booking.doctorId, date: booking.date, status: ['approved', 'in_progress'] })
  const serving = line.find((b) => b.status === 'in_progress') ?? null
  const waiting = line.filter((b) => b.status === 'approved')
  const ahead = (serving && serving.id !== booking.id ? 1 : 0) + Math.max(0, waiting.findIndex((b) => b.id === booking.id))
  return { servingTicket: serving?.ticket ?? null, ahead }
}

/** Puts these waiting bookings in the given order, reusing the places they already had in the line. */
export async function reorderQueue(ordered: Booking[]) {
  const keys = ordered.map(queueKey).sort((a, b) => a - b)
  const db = await getDb()
  for (const [i, b] of ordered.entries()) {
    if (queueKey(b) !== keys[i] || b.position === null) await db.update(bookings).set({ position: keys[i] }).where(eq(bookings.id, b.id))
  }
  // Equal keys would tie; spread them out a little so the order sticks.
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] <= keys[i - 1]) {
      keys[i] = keys[i - 1] + 0.001
      await db.update(bookings).set({ position: keys[i] }).where(eq(bookings.id, ordered[i].id))
    }
  }
}

/** A patient added at the desk: approved straight away, at the end of today's line for their doctor. */
export async function addWalkIn(input: { doctorId: string; patientName: string; phone: string; note: string }) {
  const doctor = (await getCatalog()).getDoctor(input.doctorId)
  if (!doctor) throw new Error('Unknown doctor')
  const date = todayISO()
  const time = nowHHMM()
  const line = await listBookings({ doctorId: doctor.id, date, status: ['approved', 'in_progress'] })
  const position = Math.max(minutes(time), ...line.map(queueKey)) + 1
  const db = await getDb()
  const [row] = await db
    .insert(bookings)
    .values({ ...input, id: randomId(10, 'BT'), clinicId: doctor.clinicId, date, time, walkIn: true, position, userId: null })
    .returning()
  await setStatus(row, 'approved')
  return row
}

export async function updateContact(booking: Booking, patientName: string, phone: string) {
  const db = await getDb()
  await db.update(bookings).set({ patientName, phone }).where(eq(bookings.id, booking.id))
}
