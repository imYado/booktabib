import 'server-only'
import { and, asc, eq, gt, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { bookings, notifications, prescriptions, type Prescription } from '@/db/schema'
import { addDays, daysUntil, todayISO } from './format'
import { randomId } from './ids'

const digitsOnly = (column: unknown) => sql`right(regexp_replace(${column}, '[^0-9]', '', 'g'), 9)`

/**
 * Whether the patient has booked with the doctor again since the prescription was added: a booking on
 * their account, or with the same phone number, that wasn't cancelled.
 */
async function bookedSince(p: Prescription) {
  const db = await getDb()
  const key = p.phone.replace(/\D/g, '').slice(-9)
  const who = [
    ...(p.userId ? [eq(bookings.userId, p.userId)] : []),
    ...(key.length >= 7 ? [sql`${digitsOnly(bookings.phone)} = ${key}`] : []),
  ]
  if (!who.length) return false
  const [row] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.doctorId, p.doctorId), ne(bookings.status, 'cancelled'), gt(bookings.createdAt, p.createdAt), or(...who)))
    .limit(1)
  return !!row
}

export type RenewalRow = Prescription & { booked: boolean; daysLeft: number }

/** Open prescriptions at a clinic (or for one doctor), soonest first, with whether each patient has booked again. */
export async function listRenewals(clinicId: string, doctorId?: string): Promise<RenewalRow[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(prescriptions)
    .where(and(eq(prescriptions.clinicId, clinicId), isNull(prescriptions.closedAt), ...(doctorId ? [eq(prescriptions.doctorId, doctorId)] : [])))
    .orderBy(asc(prescriptions.renewOn), asc(prescriptions.patientName))
  const today = todayISO()
  return Promise.all(rows.map(async (p) => ({ ...p, booked: await bookedSince(p), daysLeft: daysUntil(today, p.renewOn) })))
}

export async function getPrescription(id: string) {
  const db = await getDb()
  const [row] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1)
  return row
}

export async function addPrescription(input: {
  clinicId: string
  doctorId: string
  userId: string | null
  patientName: string
  phone: string
  renewOn: string
  createdBy: string
}) {
  const db = await getDb()
  await db.insert(prescriptions).values({ id: randomId(16), ...input })
}

export async function updatePrescription(id: string, change: { notifiedAt?: Date | null; closedAt?: Date | null }) {
  const db = await getDb()
  await db.update(prescriptions).set(change).where(eq(prescriptions.id, id))
}

const stageOrder = ['', '7', '3', 'day'] as const
type Stage = (typeof stageOrder)[number]

/** Which reminder is due `days` before the renewal date. */
function dueStage(days: number): Stage {
  if (days <= 0) return 'day'
  if (days <= 3) return '3'
  if (days <= 7) return '7'
  return ''
}

/**
 * Sends the prescription reminders that are due to a patient's account: 7 days before, then 3 days
 * before and on the day, the last two only while they haven't booked again. Runs when the patient opens
 * the site, which is when they would see a notification anyway, so no scheduled job is needed.
 */
export async function deliverRenewalReminders(userId: string) {
  const db = await getDb()
  const today = todayISO()
  const due = await db
    .select()
    .from(prescriptions)
    .where(
      and(
        eq(prescriptions.userId, userId),
        isNull(prescriptions.closedAt),
        lte(prescriptions.renewOn, addDays(today, 7)),
        // A week after the date, the reminder is no longer useful.
        gt(prescriptions.renewOn, addDays(today, -7)),
        ne(prescriptions.appStage, 'day'),
      ),
    )
  for (const p of due) {
    const stage = dueStage(daysUntil(today, p.renewOn))
    if (stageOrder.indexOf(stage) <= stageOrder.indexOf(p.appStage as Stage)) continue
    // Only the latest due reminder goes out, so opening the site late doesn't bring several at once.
    const send = stage === '7' || !(await bookedSince(p))
    // Claim the stage first so two pages opening at once don't both send it.
    const [claimed] = await db
      .update(prescriptions)
      .set({ appStage: stage })
      .where(and(eq(prescriptions.id, p.id), eq(prescriptions.appStage, p.appStage)))
      .returning({ id: prescriptions.id })
    if (!claimed || !send) continue
    await db.update(prescriptions).set({ appSentAt: new Date() }).where(eq(prescriptions.id, p.id))
    await db.insert(notifications).values({
      id: randomId(16),
      userId,
      clinicId: p.clinicId,
      prescriptionId: p.id,
      kind: stage === '7' ? 'renew7' : stage === '3' ? 'renew3' : 'renewDay',
    })
  }
}

/** Prescriptions shown on notifications, by id. */
export async function prescriptionsById(ids: string[]) {
  if (!ids.length) return new Map<string, Prescription>()
  const db = await getDb()
  const rows = await db.select().from(prescriptions).where(inArray(prescriptions.id, ids))
  return new Map(rows.map((r) => [r.id, r]))
}
