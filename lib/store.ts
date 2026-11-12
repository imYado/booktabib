import 'server-only'
import { and, asc, desc, eq, gte, inArray, isNotNull, ne, sql, type SQL } from 'drizzle-orm'
import { getDb } from '@/db'
import { bookings, notifications, type BookedService, type Booking, type BookingStatus } from '@/db/schema'
import { getCatalog } from './catalog'
import { dailySlots, isWorkingDay } from './data'
import { CLINIC_TIME_ZONE, todayISO } from './format'
import { randomId } from './ids'
import { getVisitMinutes } from './settings'

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

/**
 * Slots on a given day that are still free for a doctor. A slot that would land on a no-specific-time
 * patient's estimated visit isn't offered either, so a new booking never pushes their time back.
 */
export async function openSlots(doctorId: string, date: string): Promise<string[]> {
  if (!isWorkingDay(date)) return []
  const db = await getDb()
  const [taken, line, visit] = await Promise.all([
    db
      .select({ time: bookings.time })
      .from(bookings)
      .where(and(eq(bookings.doctorId, doctorId), eq(bookings.date, date), ne(bookings.status, 'cancelled'), eq(bookings.flexible, false))),
    dayLine(doctorId, date),
    getVisitMinutes([doctorId]),
  ])
  const takenSet = new Set(taken.map((b) => b.time))
  const estimates = estimateLine(line, visit[doctorId], date === todayISO() ? nowMinutes() : 0)
  const flexStarts = line.filter((b) => b.flexible && estimates.has(b.id)).map((b) => minutes(estimates.get(b.id)!))
  const clashes = (t: string) => flexStarts.some((f) => Math.abs(f - minutes(t)) < visit[doctorId])
  const now = date === todayISO() ? nowHHMM() : ''
  return dailySlots.filter((t) => !takenSet.has(t) && !clashes(t) && t > now)
}

/** Whether a "no specific time" booking can still be made for this day. */
export function flexibleOpen(date: string) {
  return isWorkingDay(date) && (date !== todayISO() || nowHHMM() < dailySlots[dailySlots.length - 1])
}

/** Everyone expected in a doctor's line on a day, in line order: requests, waiting and with the doctor. */
function dayLine(doctorId: string, date: string) {
  return listBookings({ doctorId, date, status: ['pending', 'approved', 'in_progress'] })
}

export async function createBooking(input: {
  doctorId: string
  date: string
  /** HH:MM, or '' for no specific time: the booking gets a place in the line and an estimated time. */
  time: string
  patientName: string
  phone: string
  note: string
  service?: BookedService | null
  userId: string | null
  prescriptionId?: string | null
}): Promise<Booking> {
  const doctor = (await getCatalog()).getDoctor(input.doctorId)
  if (!doctor) throw new Error('Unknown doctor')
  const db = await getDb()
  if (!input.time) {
    if (!flexibleOpen(input.date)) throw new SlotTakenError()
    const place = await flexiblePlace(doctor.id, input.date)
    const [row] = await db
      .insert(bookings)
      .values({ ...input, ...place, flexible: true, id: randomId(10, 'BT'), clinicId: doctor.clinicId })
      .returning()
    await refreshFlexibleTimes(doctor.id, input.date)
    return (await getBooking(row.id)) ?? row
  }
  if (!(await openSlots(doctor.id, input.date)).includes(input.time)) throw new SlotTakenError()
  try {
    const [row] = await db
      .insert(bookings)
      .values({ ...input, id: randomId(10, 'BT'), clinicId: doctor.clinicId })
      .returning()
    await refreshFlexibleTimes(doctor.id, input.date)
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
      .set({ status: 'done', finishedAt: Date.now() })
      .where(and(eq(bookings.doctorId, booking.doctorId), eq(bookings.status, 'in_progress'), ne(bookings.id, booking.id)))
      .returning()
    for (const b of finished) await notify(b, 'done', b.ticket)
  }
  const [row] = await db
    .update(bookings)
    .set({
      status,
      ...(status === 'in_progress' ? { calledAt: Date.now() } : {}),
      finishedAt: status === 'done' ? Date.now() : null,
    })
    .where(eq(bookings.id, booking.id))
    .returning()
  // Putting someone back in the line after a mistake isn't news to them: they were already confirmed.
  const undo = status === 'approved' && (booking.status === 'in_progress' || booking.status === 'done')
  if (row && row.status !== booking.status && booking.userId !== actorId && !undo) await notify(row, status, row.ticket)
  await refreshFlexibleTimes(booking.doctorId, booking.date)
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
  for (const b of new Map(ordered.map((b) => [b.doctorId, b])).values()) {
    await refreshFlexibleTimes(b.doctorId, b.date)
    await remindArrivals(b.doctorId)
  }
}

/**
 * A patient added at the desk, approved straight away. Without a time they have no specific time: they
 * go to the end of today's line and get an estimated time. With one (say 09:30) they go into the line
 * at that time, behind anyone already booked then.
 */
export async function addWalkIn(input: { doctorId: string; patientName: string; phone: string; note: string; time?: string }) {
  const doctor = (await getCatalog()).getDoctor(input.doctorId)
  if (!doctor) throw new Error('Unknown doctor')
  const date = todayISO()
  const time = input.time || nowHHMM()
  const line = await listBookings({ doctorId: doctor.id, date, status: ['approved', 'in_progress'] })
  const position = input.time ? minutes(input.time) + 0.5 : Math.max(minutes(time), ...line.map(queueKey)) + 1
  const db = await getDb()
  const [row] = await db
    .insert(bookings)
    .values({ ...input, id: randomId(10, 'BT'), clinicId: doctor.clinicId, date, time, walkIn: true, flexible: !input.time, position, userId: null })
    .returning()
  await setStatus(row, 'approved')
  return row
}

/**
 * Moves a waiting or requested booking to another time the same day; the line follows the new time.
 * If another patient already holds that slot both keep it, and this one stops holding a slot of its own.
 */
export async function changeTime(booking: Booking, time: string, actorId?: string) {
  if (booking.time === time || (booking.status !== 'pending' && booking.status !== 'approved')) return
  const db = await getDb()
  try {
    await db.update(bookings).set({ time, position: null, flexible: false }).where(eq(bookings.id, booking.id))
  } catch (err) {
    if (!isUniqueViolation(err)) throw err
    await db.update(bookings).set({ time, position: null, flexible: false, walkIn: true }).where(eq(bookings.id, booking.id))
  }
  if (booking.userId && booking.userId !== actorId) {
    await db.insert(notifications).values({ id: randomId(16), userId: booking.userId, bookingId: booking.id, clinicId: booking.clinicId, kind: 'moved', ticket: booking.ticket, time })
  }
  await refreshFlexibleTimes(booking.doctorId, booking.date)
  if (booking.date === todayISO()) await remindArrivals(booking.doctorId)
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

const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m) % 60).padStart(2, '0')}`

/** Minutes since midnight at the clinic for a moment in time. */
function clockMinutes(ms: number) {
  return minutes(new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms)))
}

/** Minutes since midnight at the clinic right now. */
export function nowMinutes() {
  return minutes(nowHHMM())
}

/** When the doctor starts seeing patients: the first bookable slot. */
const DAY_START = minutes(dailySlots[0])

/**
 * When each waiting patient in a doctor's line will likely be seen, in line order. The doctor takes
 * `visit` minutes per patient. A patient with a set time is never seen before their place in the line
 * (their booked time, or the time of the place they were dragged into), so they anchor the line.
 * A patient with no specific time fits around them: right after the patient ahead of them, or, when
 * the patient behind them has a set time, one visit before that time, so they wait as little as
 * possible and never hold anyone up. With a 20-minute visit, a no-time patient behind a 16:00 booking
 * is expected at 16:20, and one in front of it at 15:40. `now` is minutes since midnight, 0 for
 * another day; the estimates follow the line as people are late, called in or moved.
 */
export function estimateLine(line: Booking[], visit: number, now: number): Map<string, string> {
  const serving = line.find((b) => b.status === 'in_progress')
  const start = Math.max(now, DAY_START)
  let free = start
  if (serving) free = Math.max(start, serving.calledAt ? clockMinutes(serving.calledAt) + visit : now + visit / 2)
  const waiting = line.filter((b) => b.status === 'approved' || b.status === 'pending')
  // Earliest each patient can be seen, front to back.
  const at = waiting.map((b) => {
    const t = b.flexible ? free : Math.max(free, queueKey(b))
    free = t + visit
    return t
  })
  // Back to front: someone with no set time comes as late as the patient behind them allows.
  for (let i = waiting.length - 2; i >= 0; i--) {
    if (waiting[i].flexible) at[i] = Math.max(at[i], at[i + 1] - visit)
  }
  const out = new Map<string, string>()
  waiting.forEach((b, i) => out.set(b.id, hhmm(Math.round(at[i] / 5) * 5)))
  return out
}

/** Estimated times for everyone in a doctor's line on a day (see estimateLine). */
export async function lineEstimates(doctorId: string, date: string) {
  const [line, visit] = await Promise.all([dayLine(doctorId, date), getVisitMinutes([doctorId])])
  return estimateLine(line, visit[doctorId], date === todayISO() ? nowMinutes() : 0)
}

/**
 * Where a new no-specific-time booking goes in a doctor's line: the first place where their visit fits
 * without moving anyone else's estimated time, or else the end of the line. Returns the place in the
 * line and the time it gives them.
 */
async function flexiblePlace(doctorId: string, date: string) {
  const [line, visit] = await Promise.all([dayLine(doctorId, date), getVisitMinutes([doctorId])])
  const now = date === todayISO() ? nowMinutes() : 0
  const before = estimateLine(line, visit[doctorId], now)
  const keys = line.map(queueKey)
  const candidates: number[] = []
  // Before the first, in each gap, then at the end (just behind the last).
  for (let i = 0; i <= line.length; i++) {
    const lo = i === 0 ? Math.min(DAY_START, ...keys) - 1 : keys[i - 1]
    const hi = i === line.length ? lo + 2 : keys[i]
    candidates.push((lo + hi) / 2)
  }
  for (const position of candidates) {
    const probe = { id: '__new', flexible: true, status: 'pending', position, time: '00:00' } as Booking
    const trial = [...line, probe].sort((a, b) => queueKey(a) - queueKey(b))
    const after = estimateLine(trial, visit[doctorId], now)
    const moved = line.some((b) => before.has(b.id) && before.get(b.id) !== after.get(b.id))
    if (!moved || position === candidates[candidates.length - 1]) return { position, time: after.get('__new')! }
  }
  throw new Error('unreachable')
}

/** Keeps each no-specific-time booking's time at its current estimate, after the line changed. */
export async function refreshFlexibleTimes(doctorId: string, date: string) {
  const line = await dayLine(doctorId, date)
  if (!line.some((b) => b.flexible)) return
  const estimates = await lineEstimates(doctorId, date)
  const db = await getDb()
  for (const b of line) {
    const time = estimates.get(b.id)
    if (b.flexible && time && time !== b.time) await db.update(bookings).set({ time }).where(eq(bookings.id, b.id))
  }
}

/** How many waiting patients get the "time to come in" reminder: the next ones in line. */
const ARRIVE_AHEAD = 2

/**
 * Tells signed-in patients near the front of a doctor's line today to make their way to the clinic,
 * with the estimated time. Each booking gets this once.
 */
export async function remindArrivals(doctorId: string) {
  const today = todayISO()
  const [line, visit] = await Promise.all([listBookings({ doctorId, date: today, status: ['approved', 'in_progress'] }), getVisitMinutes([doctorId])])
  const estimates = estimateLine(line, visit[doctorId], minutes(nowHHMM()))
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
  for (const { b } of near) {
    if (done.has(b.id)) continue
    await db.insert(notifications).values({
      id: randomId(16),
      userId: b.userId!,
      bookingId: b.id,
      clinicId: b.clinicId,
      kind: 'arrive',
      ticket: b.ticket,
      time: estimates.get(b.id) ?? b.time,
    })
  }
}
