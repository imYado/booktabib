'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isLocale, LOCALE_COOKIE } from '@/lib/i18n'
import { createBooking, setStatus, type BookingStatus } from '@/lib/store'

export async function setLocale(formData: FormData) {
  const locale = formData.get('locale')
  if (!isLocale(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
}

function text(formData: FormData, key: string, max = 200) {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

export async function requestBooking(formData: FormData) {
  const doctorId = text(formData, 'doctorId')
  const date = text(formData, 'date')
  const time = text(formData, 'time')
  const patientName = text(formData, 'patientName', 80)
  const phone = text(formData, 'phone', 30)
  const note = text(formData, 'note', 300)

  if (!patientName || !phone || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    redirect(`/doctors/${encodeURIComponent(doctorId)}?day=${encodeURIComponent(date)}&error=1`)
  }

  let id: string
  try {
    id = createBooking({ doctorId, date, time, patientName, phone, note }).id
  } catch {
    redirect(`/doctors/${encodeURIComponent(doctorId)}?day=${encodeURIComponent(date)}&error=taken`)
  }
  revalidatePath('/', 'layout')
  redirect(`/bookings/${id}`)
}

const allowed: BookingStatus[] = ['approved', 'cancelled', 'in_progress', 'done']

export async function updateBooking(formData: FormData) {
  const id = text(formData, 'id')
  const status = text(formData, 'status') as BookingStatus
  if (!allowed.includes(status)) return
  setStatus(id, status)
  revalidatePath('/', 'layout')
}
