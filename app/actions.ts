'use server'

import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import { users, type BookingStatus } from '@/db/schema'
import { canUpdateBooking, endSession, getCurrentUser, startSession } from '@/lib/auth'
import { getClinic, getDoctor } from '@/lib/data'
import { isLocale, LOCALE_COOKIE } from '@/lib/i18n'
import { randomId } from '@/lib/ids'
import { hashPassword, verifyPassword } from '@/lib/password'
import { createBooking, getBooking, setStatus, SlotTakenError } from '@/lib/store'

export async function setLocale(formData: FormData) {
  const locale = formData.get('locale')
  if (!isLocale(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
}

function text(formData: FormData, key: string, max = 200) {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

/** Only allow redirects to paths on this site. */
function safeNext(value: string, fallback: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : fallback
}

export async function requestBooking(formData: FormData) {
  const doctorId = text(formData, 'doctorId')
  const date = text(formData, 'date')
  const time = text(formData, 'time')
  const patientName = text(formData, 'patientName', 80)
  const phone = text(formData, 'phone', 30)
  const note = text(formData, 'note', 300)
  const back = `/doctors/${encodeURIComponent(doctorId)}?day=${encodeURIComponent(date)}`

  if (!getDoctor(doctorId)) redirect('/clinics')
  if (!patientName || !phone || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    redirect(`${back}&error=missing`)
  }

  const user = await getCurrentUser()
  let id: string
  try {
    id = (await createBooking({ doctorId, date, time, patientName, phone, note, userId: user?.id ?? null })).id
  } catch (err) {
    if (err instanceof SlotTakenError) redirect(`${back}&error=taken`)
    throw err
  }
  revalidatePath('/', 'layout')
  redirect(`/bookings/${id}`)
}

const allowedStatuses: BookingStatus[] = ['approved', 'cancelled', 'in_progress', 'done']

export async function updateBooking(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const status = text(formData, 'status') as BookingStatus
  const booking = await getBooking(text(formData, 'id'))
  if (!booking || !allowedStatuses.includes(status) || !canUpdateBooking(user, booking, status)) return
  await setStatus(booking, status)
  revalidatePath('/', 'layout')
}

function landingFor(role: string) {
  if (role === 'assistant') return '/assistant'
  if (role === 'doctor') return '/doctor'
  if (role === 'admin') return '/admin'
  return '/account'
}

export async function login(formData: FormData) {
  const email = text(formData, 'email', 254).toLowerCase()
  const password = String(formData.get('password') ?? '')
  const next = text(formData, 'next', 500)
  const db = await getDb()
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/login?error=invalid${next ? `&next=${encodeURIComponent(next)}` : ''}`)
  }
  await startSession(user.id)
  redirect(safeNext(next, landingFor(user.role)))
}

export async function register(formData: FormData) {
  const name = text(formData, 'name', 80)
  const email = text(formData, 'email', 254).toLowerCase()
  const phone = text(formData, 'phone', 30)
  const password = String(formData.get('password') ?? '')
  const next = text(formData, 'next', 500)
  const q = next ? `&next=${encodeURIComponent(next)}` : ''

  if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/register?error=missing${q}`)
  if (password.length < 8 || password.length > 200) redirect(`/register?error=weak${q}`)

  const db = await getDb()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) redirect(`/register?error=exists${q}`)

  // The person whose email is set as ADMIN_EMAIL becomes the administrator when they sign up.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const role = adminEmail && email === adminEmail ? 'admin' : 'patient'
  const id = randomId(16)
  await db.insert(users).values({ id, email, name, phone, role, passwordHash: await hashPassword(password) })
  await startSession(id)
  redirect(safeNext(next, landingFor(role)))
}

export async function logout() {
  await endSession()
  redirect('/')
}

export type CreateStaffState = { ok: true; email: string; password: string } | { ok: false; error: 'missing' | 'exists' | 'clinic' } | null

export async function createStaff(_prev: CreateStaffState, formData: FormData): Promise<CreateStaffState> {
  const admin = await getCurrentUser()
  if (admin?.role !== 'admin') redirect('/login?denied=1')

  const name = text(formData, 'name', 80)
  const email = text(formData, 'email', 254).toLowerCase()
  const role = text(formData, 'role')
  const doctorId = text(formData, 'doctorId') || null
  const doctor = doctorId ? getDoctor(doctorId) : undefined
  const clinicId = doctor?.clinicId ?? (text(formData, 'clinicId') || null)

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['assistant', 'doctor', 'admin'].includes(role)) {
    return { ok: false, error: 'missing' }
  }
  if ((role === 'assistant' && !(clinicId && getClinic(clinicId))) || (role === 'doctor' && !doctor)) {
    return { ok: false, error: 'clinic' }
  }

  const db = await getDb()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) return { ok: false, error: 'exists' }

  const password = randomId(12).toLowerCase()
  await db.insert(users).values({
    id: randomId(16),
    email,
    name,
    role: role as 'assistant' | 'doctor' | 'admin',
    clinicId: role === 'admin' ? null : clinicId,
    doctorId: role === 'doctor' ? doctorId : null,
    passwordHash: await hashPassword(password),
  })
  revalidatePath('/admin')
  return { ok: true, email, password }
}
