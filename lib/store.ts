import 'server-only'
import { and, asc, desc, eq, gte, inArray, isNotNull, ne, sql, type SQL } from 'drizzle-orm'
import { getDb } from '@/db'
import { bookings, notifications, type BookedService, type Booking, type BookingStatus } from '@/db/schema'
import { getCatalog } from './catalog'
import { dailySlots, isWorkingDay, MINUTES_PER_PATIENT } from './data'
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
  service?: BookedService | null
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

/** Tells the patient's account what the clinic did with their booking. */
async function notify(booking: Pick<Booking, 'id' | 'userId' | 'clinicId'>, status: BookingStatus, ticket: number | null) {
  const kind = { approved: 'approved', in_progress: 'turn', cancelled: 'cancelled', done: 'done', pending: null }[status]
  if (!booking.userId || !kind) return
  const db = await getDb()
  await db.insert(notifications).values({ id: randomId(16), userId: booking.userId, bookingId: booking.id, clinicId: booking.clinicId, kind, ticket })
}

/** Changes a booking's status. `actorId` is who did it, so patients aren't told about their own changes. */
export async function setStatus(booking: Booking, status: BookingStatus, actorId?: string) {
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
    const finished = await db
      .update(bookings)
      .set({ status: 'done' })
      .where(and(eq(bookings.doctorId, booking.doctorId), eq(bookings.status, 'in_progress'), ne(bookings.id, booking.id)))
      .returning()
    for (const b of finished) await notify(b, 'done', b.ticket)
  }
  const [row] = await db
    .update(bookings)
    .set({ status, ...(status === 'in_progress' ? { calledAt: Date.now() } : {}) })
    .where(eq(bookings.id, booking.id))
    .returning()
  if (row && row.status !== booking.status && booking.userId !== actorId) await notify(row, status, row.ticket)
  if (booking.date === todayISO()) await remindArrivals(booking.doctorId)
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
  for (const doctorId of new Set(ordered.map((b) => b.doctorId))) await remindArrivals(doctorId)
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

/** The last 9 digits of a phone number, reading Arabic-Indic digits too, so "0750 123 4567" and "+964 750 123 4567" match. */
function phoneKey(phone: string) {
  const ascii = phone.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
  return ascii.replace(/\D/g, '').slice(-9)
}

/**
 * Adds a booking made without an account to the signed-in user's account, from its live link. Only a
 * booking nobody owns yet, and only when it was made with the account's phone number: a forwarded link
 * alone is not enough to see the booking's phone number and note.
 */
export async function claimBooking(token: string, user: { id: string; phone: string }): Promise<'claimed' | 'mismatch' | 'none'> {
  const booking = await getBookingByLiveToken(token)
  if (!booking) return 'none'
  if (booking.userId === user.id) return 'claimed'
  const key = phoneKey(booking.phone)
  if (booking.userId || key.length < 7 || key !== phoneKey(user.phone)) return 'mismatch'
  const db = await getDb()
  const [row] = await db
    .update(bookings)
    .set({ userId: user.id })
    .where(and(eq(bookings.id, booking.id), sql`${bookings.userId} is null`))
    .returning({ id: bookings.id })
  return row ? 'claimed' : 'mismatch'
}

/** When a waiting patient will likely be seen: their own time, or later when `ahead` people are before them. */
export function estimatedTime(booking: Pick<Booking, 'time'>, ahead: number) {
  const m = Math.round(Math.max(minutes(booking.time), minutes(nowHHMM()) + ahead * MINUTES_PER_PATIENT) / 5) * 5
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** How many waiting patients get the "time to come in" reminder: the next ones in line. */
const ARRIVE_AHEAD = 2

/**
 * Tells signed-in patients near the front of a doctor's line today to make their way to the clinic,
 * with the estimated time. Each booking gets this once.
 */
export async function remindArrivals(doctorId: string) {
  const today = todayISO()
  const line = await listBookings({ doctorId, date: today, status: ['approved', 'in_progress'] })
  const serving = line.some((b) => b.status === 'in_progress') ? 1 : 0
  const near = line
    .filter((b) => b.status === 'approved')
    .map((b, i) => ({ b, ahead: serving + i }))
    .filter(({ b, ahead }) => b.userId && ahead <= ARRIVE_AHEAD)
  if (!near.length) return
  const db = await getDb()
  const told = await db
    .select({ bookingId: notifications.bookingId })
    .from(notifications)
    .where(and(eq(notifications.kind, 'arrive'), isNotNull(notifications.bookingId), inArray(notifications.bookingId, near.map(({ b }) => b.id))))
  const done = new Set(told.map((r) => r.bookingId))
  for (const { b, ahead } of near) {
    if (done.has(b.id)) continue
    await db.insert(notifications).values({
      id: randomId(16),
      userId: b.userId!,
      bookingId: b.id,
      clinicId: b.clinicId,
      kind: 'arrive',
      ticket: b.ticket,
      time: estimatedTime(b, ahead),
    })
  }
}
