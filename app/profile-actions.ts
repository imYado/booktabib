'use server'

import { and, eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import { clinicRatings, favorites, sessions, users } from '@/db/schema'
import { endOtherSessions, endSession, getCurrentUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { hashPassword, isWeakPassword, verifyPassword } from '@/lib/password'
import { hit, isLimited, overLimit } from '@/lib/rate-limit'
import { canRateClinic } from '@/lib/ratings'
import { isTheme, THEME_COOKIE } from '@/lib/theme'

// The signed-in user's own profile: details, favourites, theme, password and account.

function text(formData: FormData, key: string, max = 200) {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

/** Checks the user's own password, allowing 5 wrong tries every 15 minutes. */
async function passwordOk(userId: string, password: string) {
  const key = `password:user:${userId}`
  if (await isLimited(key, 5)) return 'locked'
  const db = await getDb()
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1)
  if (row && (await verifyPassword(password, row.hash))) return 'ok'
  await hit(key, 15)
  return 'wrong'
}

async function me() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/account')
  return user
}

/** Hearts or un-hearts a clinic. Returns whether it is now a favourite. */
export async function toggleFavorite(clinicId: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user || typeof clinicId !== 'string') return false
  const { getClinic } = await getCatalog()
  if (!getClinic(clinicId)) return false
  const db = await getDb()
  const where = and(eq(favorites.userId, user.id), eq(favorites.clinicId, clinicId))
  const [existing] = await db.select({ clinicId: favorites.clinicId }).from(favorites).where(where).limit(1)
  if (existing) await db.delete(favorites).where(where)
  else await db.insert(favorites).values({ userId: user.id, clinicId }).onConflictDoNothing()
  revalidatePath('/account')
  return !existing
}

/** Saves a 1 to 5 star rating for a clinic the user has booked at. Returns the saved stars, or 0 if not allowed. */
export async function rateClinic(clinicId: string, stars: number): Promise<number> {
  const user = await getCurrentUser()
  if (!user || typeof clinicId !== 'string' || !Number.isInteger(stars) || stars < 1 || stars > 5) return 0
  const { getClinic } = await getCatalog()
  if (!getClinic(clinicId) || !(await canRateClinic(user.id, clinicId))) return 0
  if (await overLimit(`rate:user:${user.id}`, 30, 10)) return 0
  const db = await getDb()
  await db
    .insert(clinicRatings)
    .values({ userId: user.id, clinicId, stars })
    .onConflictDoUpdate({ target: [clinicRatings.userId, clinicRatings.clinicId], set: { stars, updatedAt: new Date() } })
  revalidatePath('/', 'layout')
  return stars
}

export async function setTheme(formData: FormData) {
  const theme = formData.get('theme')
  if (!isTheme(theme)) return
  ;(await cookies()).set(THEME_COOKIE, theme, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
}

export async function updateProfile(formData: FormData) {
  const user = await me()
  const name = text(formData, 'name', 80)
  const phone = text(formData, 'phone', 30)
  const gender = text(formData, 'gender')
  const birthDate = text(formData, 'birthDate', 10)
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && birthDate >= '1900-01-01' && birthDate <= new Date().toISOString().slice(0, 10)
  if (!name || (birthDate && !validDate)) redirect('/account?error=missing#details')
  const db = await getDb()
  await db
    .update(users)
    .set({
      name,
      phone,
      gender: gender === 'male' || gender === 'female' ? gender : '',
      birthDate: birthDate || null,
    })
    .where(eq(users.id, user.id))
  revalidatePath('/', 'layout')
  redirect('/account?saved=details#details')
}

export async function changePassword(formData: FormData) {
  const user = await me()
  const current = String(formData.get('current') ?? '')
  const next = String(formData.get('password') ?? '')
  const check = await passwordOk(user.id, current)
  if (check !== 'ok') redirect(`/account?error=${check === 'locked' ? 'locked' : 'password'}#security`)
  if (isWeakPassword(next, user.email) || next === current) redirect('/account?error=weak#security')
  const db = await getDb()
  await db.update(users).set({ passwordHash: await hashPassword(next), mustChangePassword: false }).where(eq(users.id, user.id))
  // Other devices have to log in again with the new password; this one stays signed in.
  await endOtherSessions(user.id)
  redirect('/account?saved=password#security')
}

export async function logoutEverywhere() {
  const user = await me()
  const db = await getDb()
  await db.delete(sessions).where(eq(sessions.userId, user.id))
  await endSession()
  redirect('/login')
}

/** Patients can delete their own account. Their bookings stay with the clinic, without the account link. */
export async function deleteOwnAccount(formData: FormData) {
  const user = await me()
  if (user.role !== 'patient') redirect('/account')
  const check = await passwordOk(user.id, String(formData.get('password') ?? ''))
  if (check !== 'ok') redirect(`/account?error=${check === 'locked' ? 'locked' : 'password'}#delete`)
  const db = await getDb()
  await endSession()
  await db.delete(users).where(eq(users.id, user.id))
  redirect('/')
}
