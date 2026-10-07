import 'server-only'
import { createHash } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getDb } from '@/db'
import { sessions, users, type Booking, type BookingStatus, type User } from '@/db/schema'
import { randomToken } from './ids'

export const SESSION_COOKIE = 'bt_session'
const SESSION_DAYS = 30

export type Role = User['role']
export type SessionUser = Omit<User, 'passwordHash'>

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function startSession(userId: string) {
  const token = randomToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  const db = await getDb()
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt })
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function endSession() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) {
    const db = await getDb()
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)))
  }
  jar.delete(SESSION_COOKIE)
}

/** The signed-in user for this request, or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const db = await getDb()
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      role: users.role,
      clinicId: users.clinicId,
      doctorId: users.doctorId,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)
  return row ?? null
})

/** Sends visitors who are not signed in with one of `roles` to the login page. */
export async function requireUser(roles: Role[], next: string): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`)
  if (!roles.includes(user.role)) redirect('/login?denied=1')
  return user
}

/** Whether a staff member may move a booking to `status`. */
export function canUpdateBooking(
  user: SessionUser,
  booking: Pick<Booking, 'clinicId' | 'doctorId' | 'userId' | 'status'>,
  status: BookingStatus,
) {
  if (user.role === 'admin') return true
  if (booking.userId === user.id && status === 'cancelled') return booking.status === 'pending' || booking.status === 'approved'
  // An assistant works for a whole clinic, or for one doctor in it.
  if (user.role === 'assistant') return user.clinicId === booking.clinicId && (!user.doctorId || user.doctorId === booking.doctorId)
  if (user.role === 'doctor') return user.doctorId === booking.doctorId && (status === 'in_progress' || status === 'done')
  return false
}

/** Whether a user may change a clinic's page settings: admins, and assistants for the whole clinic. */
export function canManageClinic(user: SessionUser, clinicId: string) {
  return user.role === 'admin' || (user.role === 'assistant' && user.clinicId === clinicId && !user.doctorId)
}

/** Whether a user may change a doctor's contact settings: admins, the clinic's assistants, and the doctor. */
export function canManageDoctor(user: SessionUser, doctor: { id: string; clinicId: string }) {
  if (user.role === 'admin') return true
  if (user.role === 'doctor') return user.doctorId === doctor.id
  if (user.role === 'assistant') return user.clinicId === doctor.clinicId && (!user.doctorId || user.doctorId === doctor.id)
  return false
}
