'use server'

import { and, eq, inArray, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import { type ClinicInfo, type DoctorService, bookings, notifications, prescriptions, clinics, clinicSettings, doctors, doctorSettings, images, sessions, users } from '@/db/schema'
import { canManageClinic, getCurrentUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { MAX_GALLERY, isCity, isHonorific, isSpecialty } from '@/lib/data'
import { locales, type Localized } from '@/lib/i18n'
import { randomId } from '@/lib/ids'
import { hashPassword } from '@/lib/password'

// Edit mode for administrators: clinics, doctors, staff accounts and bookings.

async function requireAdmin() {
  const user = await getCurrentUser()
  if (user?.role !== 'admin') redirect('/login?denied=1')
  return user
}

function text(formData: FormData, key: string, max = 200) {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

function num(formData: FormData, key: string, min: number, max: number) {
  const n = Number(text(formData, key, 30))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min
}

/** A field written in each language (name_en, name_ar, name_ckb), stored as typed. The site fills empty languages from another. */
function localized(formData: FormData, key: string, max = 200): Localized {
  const out = { en: '', ar: '', ckb: '' } as Localized
  for (const l of locales) out[l] = text(formData, `${key}_${l}`, max)
  return out
}

/** Drops a "Dr." typed into the name itself, since the title is picked separately. */
function withoutDr(name: Localized): Localized {
  const out = { ...name }
  for (const l of locales) out[l] = out[l].replace(/^(dr\.?|د\.)\s+/i, '')
  return out
}

/** Whether at least one language was filled in. */
function written(value: Localized) {
  return locales.some((l) => value[l])
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024

/** The image type from the file's first bytes, so a renamed file can't pass as a photo. */
function sniffImage(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to))
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

/**
 * Applies the photo part of a form: a new upload replaces the old photo, "removePhoto" clears it.
 * Returns the new image id (or null), undefined when nothing changes, or 'invalid'.
 */
async function photoChange(formData: FormData, current: string | null): Promise<string | null | undefined | 'invalid'> {
  const file = formData.get('photo')
  const db = await getDb()
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO_BYTES) return 'invalid'
    const bytes = new Uint8Array(await file.arrayBuffer())
    const contentType = sniffImage(bytes)
    if (!contentType) return 'invalid'
    const id = randomId(16)
    await db.insert(images).values({ id, contentType, data: Buffer.from(bytes).toString('base64') })
    if (current) await db.delete(images).where(eq(images.id, current))
    return id
  }
  if (formData.get('removePhoto') && current) {
    await db.delete(images).where(eq(images.id, current))
    return null
  }
  return undefined
}

function done(path: string, query = 'saved=1') {
  revalidatePath('/', 'layout')
  redirect(`${path}${path.includes('?') ? '&' : '?'}${query}`)
}

// Clinics

export async function createClinic(formData: FormData) {
  await requireAdmin()
  const name = localized(formData, 'name', 120)
  const city = text(formData, 'city')
  if (!written(name) || !isCity(city)) redirect('/admin/clinics?error=missing')
  const { getClinic } = await getCatalog()
  // Ids come from the English name; names in other scripts get a random one.
  const base = slug(name.en)
  let id = base || `clinic-${randomId(6).toLowerCase()}`
  if (getClinic(id)) id = `${id}-${randomId(4).toLowerCase()}`
  const db = await getDb()
  const empty = { en: '', ar: '', ckb: '' }
  await db.insert(clinics).values({ id, name, city, address: empty, about: empty, phone: text(formData, 'phone', 30) })
  revalidatePath('/', 'layout')
  redirect(`/admin/clinics/${id}`)
}

export async function updateClinic(formData: FormData) {
  await requireAdmin()
  const { getClinic } = await getCatalog()
  const clinic = getClinic(text(formData, 'id'))
  if (!clinic) redirect('/admin/clinics')
  const back = `/admin/clinics/${clinic.id}`
  const name = localized(formData, 'name', 120)
  const city = text(formData, 'city')
  if (!written(name) || !isCity(city)) redirect(`${back}?error=missing`)

  const imageId = await photoChange(formData, clinic.imageId)
  if (imageId === 'invalid') redirect(`${back}?error=photo`)
  const db = await getDb()
  await db
    .update(clinics)
    .set({
      name,
      city,
      address: localized(formData, 'address', 300),
      about: localized(formData, 'about', 1500),
      phone: text(formData, 'phone', 30),
      lat: num(formData, 'lat', -90, 90),
      lng: num(formData, 'lng', -180, 180),
      hours: localized(formData, 'hours', 200),
      info: clinicInfo(formData),
      specialties: formData.getAll('specialties').map(String).filter(isSpecialty),
      ...(imageId !== undefined ? { imageId } : {}),
    })
    .where(eq(clinics.id, clinic.id))
  done(back)
}

/** The "More information" rows, sent as parallel lists (info_title_en, …, info_body_ckb) in the order shown. Empty rows are dropped. */
function clinicInfo(formData: FormData): ClinicInfo[] {
  const column = (key: string, max: number) => formData.getAll(key).map((v) => String(v).trim().slice(0, max))
  const titles = Object.fromEntries(locales.map((l) => [l, column(`info_title_${l}`, 80)])) as Record<string, string[]>
  const bodies = Object.fromEntries(locales.map((l) => [l, column(`info_body_${l}`, 600)])) as Record<string, string[]>
  const rows: ClinicInfo[] = []
  for (let i = 0; i < Math.min(titles.en.length, MAX_INFO); i++) {
    const title = { en: titles.en[i] ?? '', ar: titles.ar[i] ?? '', ckb: titles.ckb[i] ?? '' }
    const body = { en: bodies.en[i] ?? '', ar: bodies.ar[i] ?? '', ckb: bodies.ckb[i] ?? '' }
    if (written(title) || written(body)) rows.push({ title, body })
  }
  return rows
}

const MAX_INFO = 12

/** The clinic, when the signed-in user may change its page: admins, and the clinic's own assistants. */
async function managedClinic(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const db = await getDb()
  const id = text(formData, 'clinicId')
  const [row] = await db.select({ id: clinics.id, gallery: clinics.gallery }).from(clinics).where(eq(clinics.id, id)).limit(1)
  if (!row || !canManageClinic(user, row.id)) return null
  return { db, id: row.id, gallery: row.gallery ?? [] }
}

export type GalleryResult = { ok: true } | { ok: false; error: 'photo' | 'full' | 'denied' }

/** Adds one photo to the end of a clinic's gallery. The page uploads several photos one after another. */
export async function addClinicPhoto(formData: FormData): Promise<GalleryResult> {
  const clinic = await managedClinic(formData)
  if (!clinic) return { ok: false, error: 'denied' }
  if (clinic.gallery.length >= MAX_GALLERY) return { ok: false, error: 'full' }
  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO_BYTES) return { ok: false, error: 'photo' }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const contentType = sniffImage(bytes)
  if (!contentType) return { ok: false, error: 'photo' }
  const id = randomId(16)
  await clinic.db.insert(images).values({ id, contentType, data: Buffer.from(bytes).toString('base64') })
  await clinic.db
    .update(clinics)
    .set({ gallery: [...clinic.gallery, id] })
    .where(eq(clinics.id, clinic.id))
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Removes a photo from a clinic's gallery and deletes it. */
export async function removeClinicPhoto(formData: FormData) {
  const clinic = await managedClinic(formData)
  if (!clinic) return
  const imageId = text(formData, 'imageId')
  if (!clinic.gallery.includes(imageId)) return
  await clinic.db
    .update(clinics)
    .set({ gallery: clinic.gallery.filter((x) => x !== imageId) })
    .where(eq(clinics.id, clinic.id))
  await clinic.db.delete(images).where(eq(images.id, imageId))
  revalidatePath('/', 'layout')
}

/** Moves a gallery photo one place earlier or later. */
export async function moveClinicPhoto(formData: FormData) {
  const clinic = await managedClinic(formData)
  if (!clinic) return
  const from = clinic.gallery.indexOf(text(formData, 'imageId'))
  const to = from + (formData.get('dir') === 'later' ? 1 : -1)
  if (from < 0 || to < 0 || to >= clinic.gallery.length) return
  const gallery = [...clinic.gallery]
  ;[gallery[from], gallery[to]] = [gallery[to], gallery[from]]
  await clinic.db.update(clinics).set({ gallery }).where(eq(clinics.id, clinic.id))
  revalidatePath('/', 'layout')
}

export async function deleteClinic(formData: FormData) {
  await requireAdmin()
  const { getClinic, doctorsAt } = await getCatalog()
  const clinic = getClinic(text(formData, 'id'))
  if (!clinic) redirect('/admin/clinics')
  if (formData.get('confirm') !== 'on') redirect(`/admin/clinics/${clinic.id}?error=confirm#danger`)

  const team = doctorsAt(clinic.id)
  const doctorIds = team.map((d) => d.id)
  const imageIds = [clinic.imageId, ...clinic.gallery, ...team.map((d) => d.imageId)].filter((x): x is string => !!x)
  const db = await getDb()
  // Staff keep their accounts, without a clinic; everything else about the clinic goes.
  await db.update(users).set({ clinicId: null, doctorId: null }).where(eq(users.clinicId, clinic.id))
  if (doctorIds.length) {
    await db.update(users).set({ doctorId: null }).where(inArray(users.doctorId, doctorIds))
    await db.delete(doctorSettings).where(inArray(doctorSettings.doctorId, doctorIds))
  }
  await db.delete(bookings).where(eq(bookings.clinicId, clinic.id))
  await db.delete(prescriptions).where(eq(prescriptions.clinicId, clinic.id))
  await db.delete(notifications).where(eq(notifications.clinicId, clinic.id))
  await db.delete(clinicSettings).where(eq(clinicSettings.clinicId, clinic.id))
  await db.delete(clinics).where(eq(clinics.id, clinic.id)) // its doctors go with it
  if (imageIds.length) await db.delete(images).where(inArray(images.id, imageIds))
  done('/admin/clinics', 'deleted=1')
}

// Doctors

export async function createDoctor(formData: FormData) {
  await requireAdmin()
  const { getClinic, doctorsAt } = await getCatalog()
  const clinic = getClinic(text(formData, 'clinicId'))
  if (!clinic) redirect('/admin/clinics')
  const back = `/admin/clinics/${clinic.id}`
  const name = withoutDr(localized(formData, 'name', 120))
  const specialty = text(formData, 'specialty')
  if (!written(name) || !isSpecialty(specialty)) redirect(`${back}?error=missing#doctors`)
  const honorific = text(formData, 'honorific')
  const id = `${slug(name.en) || 'doctor'}-${randomId(4).toLowerCase()}`
  const db = await getDb()
  const empty = { en: '', ar: '', ckb: '' }
  await db.insert(doctors).values({
    id,
    clinicId: clinic.id,
    name,
    honorific: isHonorific(honorific) && honorific !== 'other' ? honorific : 'none',
    specialty,
    title: empty,
    bio: empty,
    sort: Math.max(0, ...doctorsAt(clinic.id).map((d) => d.sort)) + 1,
  })
  revalidatePath('/', 'layout')
  redirect(`${back}?added=${id}#doctor-${id}`)
}

/**
 * The services rows of the doctor form, sent as parallel lists in the order shown. Rows without a
 * name are dropped. Prices are whole thousands of Iraqi dinars.
 */
function servicesFrom(formData: FormData): DoctorService[] {
  const names = Object.fromEntries(locales.map((l) => [l, formData.getAll(`service_name_${l}`).map((v) => String(v).trim().slice(0, 80))]))
  const fees = formData.getAll('service_fee').map((v) => Number(v))
  const out: DoctorService[] = []
  for (let i = 0; i < Math.min(fees.length, 12); i++) {
    const name = { en: names.en[i] ?? '', ar: names.ar[i] ?? '', ckb: names.ckb[i] ?? '' }
    if (!written(name)) continue
    const fee = Number.isFinite(fees[i]) ? Math.min(100_000_000, Math.max(0, fees[i])) : 0
    out.push({ name, fee: Math.round(fee / 1000) * 1000 })
  }
  return out
}

export async function updateDoctor(formData: FormData) {
  await requireAdmin()
  const { getDoctor } = await getCatalog()
  const doctor = getDoctor(text(formData, 'id'))
  if (!doctor) redirect('/admin/clinics')
  const back = `/admin/clinics/${doctor.clinicId}`
  const name = withoutDr(localized(formData, 'name', 120))
  const specialty = text(formData, 'specialty')
  if (!written(name) || !isSpecialty(specialty)) redirect(`${back}?error=missing#doctor-${doctor.id}`)
  const honorific = text(formData, 'honorific')
  const honorificOther = localized(formData, 'honorificOther', 40)

  const services = servicesFrom(formData)
  const imageId = await photoChange(formData, doctor.imageId)
  if (imageId === 'invalid') redirect(`${back}?error=photo#doctor-${doctor.id}`)
  const db = await getDb()
  await db
    .update(doctors)
    .set({
      name,
      // An empty "other" title means no title.
      honorific: !isHonorific(honorific) || (honorific === 'other' && !written(honorificOther)) ? 'none' : honorific,
      honorificOther: honorific === 'other' ? honorificOther : {},
      specialty,
      title: localized(formData, 'title', 200),
      bio: localized(formData, 'bio', 1500),
      years: Math.round(num(formData, 'years', 0, 80)),
      services,
      fee: services.length ? Math.min(...services.map((s) => s.fee)) : 0,
      room: text(formData, 'room', 20),
      ...(imageId !== undefined ? { imageId } : {}),
    })
    .where(eq(doctors.id, doctor.id))
  done(back, `saved=${doctor.id}#doctor-${doctor.id}`)
}

export async function deleteDoctor(formData: FormData) {
  await requireAdmin()
  const { getDoctor } = await getCatalog()
  const doctor = getDoctor(text(formData, 'id'))
  if (!doctor) redirect('/admin/clinics')
  const db = await getDb()
  await db.update(users).set({ doctorId: null }).where(eq(users.doctorId, doctor.id))
  await db.delete(bookings).where(eq(bookings.doctorId, doctor.id))
  await db.delete(prescriptions).where(eq(prescriptions.doctorId, doctor.id))
  await db.delete(doctorSettings).where(eq(doctorSettings.doctorId, doctor.id))
  await db.delete(doctors).where(eq(doctors.id, doctor.id))
  if (doctor.imageId) await db.delete(images).where(eq(images.id, doctor.imageId))
  done(`/admin/clinics/${doctor.clinicId}`, 'saved=1#doctors')
}

// Staff accounts

export async function updateAccount(formData: FormData) {
  const admin = await requireAdmin()
  const { getClinic, getDoctor } = await getCatalog()
  const id = text(formData, 'id')
  const name = text(formData, 'name', 80)
  const email = text(formData, 'email', 254).toLowerCase()
  // Administrators can't change their own role, so there is always one left.
  const role = id === admin.id ? 'admin' : text(formData, 'role')
  const doctorId = text(formData, 'doctorId') || null
  const doctor = doctorId ? getDoctor(doctorId) : undefined
  const clinicId = role === 'doctor' ? (doctor?.clinicId ?? null) : text(formData, 'clinicId') || null
  const back = text(formData, 'back', 200).startsWith('/admin') ? text(formData, 'back', 200) : '/admin'

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['assistant', 'doctor', 'admin'].includes(role)) {
    redirect(`${back}?error=missing`)
  }
  if (
    (role === 'assistant' && (!(clinicId && getClinic(clinicId)) || (doctorId && doctor?.clinicId !== clinicId))) ||
    (role === 'doctor' && !doctor)
  ) {
    redirect(`${back}?error=clinic`)
  }
  const db = await getDb()
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, id)))
    .limit(1)
  if (taken) redirect(`${back}?error=exists`)
  await db
    .update(users)
    .set({
      name,
      email,
      role: role as 'assistant' | 'doctor' | 'admin',
      clinicId: role === 'admin' ? null : clinicId,
      doctorId: role === 'admin' ? null : doctorId,
    })
    .where(and(eq(users.id, id), ne(users.role, 'patient')))
  done(back)
}

export async function deleteAccount(formData: FormData) {
  const admin = await requireAdmin()
  const id = text(formData, 'id')
  const back = text(formData, 'back', 200).startsWith('/admin') ? text(formData, 'back', 200) : '/admin'
  if (id === admin.id) redirect(back)
  const db = await getDb()
  await db.delete(users).where(and(eq(users.id, id), ne(users.role, 'patient'))) // sessions go with it
  done(back)
}

export type ResetPasswordState = { password: string } | null

/** Gives a staff account a new temporary password and signs it out everywhere. */
export async function resetPassword(_prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const admin = await requireAdmin()
  const id = text(formData, 'id')
  if (id === admin.id) return null
  const db = await getDb()
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1)
  if (!user || user.role === 'patient') return null
  const password = randomId(12).toLowerCase()
  await db.update(users).set({ passwordHash: await hashPassword(password), mustChangePassword: true }).where(eq(users.id, id))
  await db.delete(sessions).where(eq(sessions.userId, id))
  return { password }
}

// Bookings

export async function deleteBooking(formData: FormData) {
  await requireAdmin()
  const id = text(formData, 'id')
  const db = await getDb()
  const [row] = await db.delete(bookings).where(eq(bookings.id, id)).returning({ clinicId: bookings.clinicId })
  done(row ? `/admin/clinics/${row.clinicId}/patients` : '/admin/clinics')
}
