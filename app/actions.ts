'use server'

import { createHash, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import { users, type BookingStatus } from '@/db/schema'
import { isAccent } from '@/lib/accents'
import { canManageClinic, canManageDoctor, canUpdateBooking, endSession, getCurrentUser, startSession } from '@/lib/auth'
import { getClinic, getDoctor } from '@/lib/data'
import { isLocale, LOCALE_COOKIE } from '@/lib/i18n'
import { todayISO } from '@/lib/format'
import { randomId } from '@/lib/ids'
import { hashPassword, verifyPassword } from '@/lib/password'
import { setClinicAccent, setDoctorWhatsapp } from '@/lib/settings'
import { addWalkIn, createBooking, getBooking, reorderQueue, setStatus, SlotTakenError, updateContact } from '@/lib/store'

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
  let booking: Awaited<ReturnType<typeof createBooking>>
  try {
    booking = await createBooking({ doctorId, date, time, patientName, phone, note, userId: user?.id ?? null })
  } catch (err) {
    if (err instanceof SlotTakenError) redirect(`${back}&error=taken`)
    throw err
  }
  revalidatePath('/', 'layout')
  // Signed-in patients get the full booking page; everyone else gets their private live link.
  redirect(user ? `/bookings/${booking.id}` : `/q/${booking.liveToken}`)
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

function setupCodeMatches(given: string) {
  const expected = process.env.ADMIN_SETUP_CODE?.trim()
  if (!expected || expected.length < 12) return false
  const a = createHash('sha256').update(given.trim()).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
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

  // The ADMIN_EMAIL address becomes the administrator only together with the secret ADMIN_SETUP_CODE.
  // Without the code nobody can register that address, so it can't be claimed by someone else first.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const isAdmin = Boolean(adminEmail && email === adminEmail)
  if (isAdmin && !setupCodeMatches(String(formData.get('setupCode') ?? ''))) {
    redirect(`/register?error=reserved&setup=1${q}`)
  }
  const role = isAdmin ? 'admin' : 'patient'

  const db = await getDb()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) redirect(`/register?error=exists${q}`)
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
  // A doctor's clinic comes from the doctor; an assistant picks a clinic, and optionally one doctor in it.
  const clinicId = role === 'doctor' ? (doctor?.clinicId ?? null) : text(formData, 'clinicId') || null

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['assistant', 'doctor', 'admin'].includes(role)) {
    return { ok: false, error: 'missing' }
  }
  if (
    (role === 'assistant' && (!(clinicId && getClinic(clinicId)) || (doctorId && doctor?.clinicId !== clinicId))) ||
    (role === 'doctor' && !doctor)
  ) {
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
    doctorId: role === 'admin' ? null : doctorId,
    passwordHash: await hashPassword(password),
  })
  revalidatePath('/admin')
  return { ok: true, email, password }
}

export async function updateClinicAccent(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const clinicId = text(formData, 'clinicId')
  const accent = text(formData, 'accent')
  if (!getClinic(clinicId) || !isAccent(accent) || !canManageClinic(user, clinicId)) return
  await setClinicAccent(clinicId, accent)
  revalidatePath('/', 'layout')
}

export async function updateDoctorWhatsapp(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const doctor = getDoctor(text(formData, 'doctorId'))
  // Keep a leading + and digits only; an empty value falls back to the clinic number.
  const whatsapp = text(formData, 'whatsapp', 30).replace(/(?!^\+)[^\d]/g, '')
  if (!doctor || !canManageDoctor(user, doctor) || (whatsapp && whatsapp.replace('+', '').length < 8)) return
  await setDoctorWhatsapp(doctor.id, whatsapp)
  revalidatePath('/', 'layout')
}

/** Staff who run a clinic's desk for this doctor: admins and the clinic's assistants. */
async function deskUserFor(doctorId: string) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const doctor = getDoctor(doctorId)
  if (!doctor || (user.role !== 'admin' && !(user.role === 'assistant' && canManageDoctor(user, doctor)))) return null
  return user
}

export async function addPatient(formData: FormData) {
  const doctorId = text(formData, 'doctorId')
  const patientName = text(formData, 'patientName', 80)
  const phone = text(formData, 'phone', 30)
  if (!patientName || !(await deskUserFor(doctorId))) return
  await addWalkIn({ doctorId, patientName, phone, note: text(formData, 'note', 300) })
  revalidatePath('/', 'layout')
}

export async function editPatient(formData: FormData) {
  const booking = await getBooking(text(formData, 'id'))
  const patientName = text(formData, 'patientName', 80)
  const phone = text(formData, 'phone', 30)
  if (!booking || !patientName || !(await deskUserFor(booking.doctorId))) return
  await updateContact(booking, patientName, phone)
  revalidatePath('/', 'layout')
}

/** Saves the order an assistant dragged today's waiting patients into. */
export async function reorderPatients(ids: string[]) {
  if (!Array.isArray(ids) || ids.length > 500) return
  const user = await getCurrentUser()
  if (!user) return
  const rows = await Promise.all(ids.map((id) => getBooking(String(id))))
  const today = todayISO()
  const ordered = rows.filter((b): b is NonNullable<typeof b> => !!b && b.status === 'approved' && b.date === today)
  if (ordered.length !== ids.length || !ordered.every((b) => canUpdateBooking(user, b, 'approved') && user.role !== 'patient')) return
  await reorderQueue(ordered)
  revalidatePath('/', 'layout')
}
