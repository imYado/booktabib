'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canManageDoctor, getCurrentUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { addDays, todayISO } from '@/lib/format'
import { addPrescription, getPrescription, updatePrescription } from '@/lib/prescriptions'
import { getBooking } from '@/lib/store'

// Prescription renewal reminders, kept by the doctor and the clinic's assistants.

function text(formData: FormData, key: string, max = 200) {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

/** Back to the desk or dashboard the form was on. */
function backTo(formData: FormData, flag: string) {
  const back = text(formData, 'back', 300)
  const path = /^\/(assistant|doctor)(\?[\w=&%-]*)?$/.test(back) ? back : '/'
  return `${path}${path.includes('?') ? '&' : '?'}renew=${flag}#renewals`
}

/** Staff (not patients) who look after this doctor's patients. */
async function staffFor(doctorId: string) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const doctor = (await getCatalog()).getDoctor(doctorId)
  if (!doctor || user.role === 'patient' || !canManageDoctor(user, doctor)) return null
  return { user, doctor }
}

export async function addRenewal(formData: FormData) {
  const renewOn = text(formData, 'renewOn', 10)
  const today = todayISO()
  const booking = text(formData, 'bookingId') ? await getBooking(text(formData, 'bookingId')) : undefined
  const doctorId = booking?.doctorId ?? text(formData, 'doctorId')
  const access = await staffFor(doctorId)
  const patientName = booking?.patientName ?? text(formData, 'patientName', 80)
  const phone = booking?.phone ?? text(formData, 'phone', 30)
  if (!access || !patientName || !/^\d{4}-\d{2}-\d{2}$/.test(renewOn) || renewOn < today || renewOn > addDays(today, 366)) {
    redirect(backTo(formData, 'missing'))
  }
  await addPrescription({
    clinicId: access.doctor.clinicId,
    doctorId: access.doctor.id,
    // In-app reminders only go to the account the booking was made from.
    userId: booking?.userId ?? null,
    patientName,
    phone,
    renewOn,
    createdBy: access.user.id,
  })
  revalidatePath('/', 'layout')
  redirect(backTo(formData, 'added'))
}

async function ownRenewal(id: string) {
  const p = await getPrescription(String(id))
  if (!p || !(await staffFor(p.doctorId))) return null
  return p
}

/** Ticks or unticks "told the patient". Sending the WhatsApp message ticks it. */
export async function setRenewalNotified(id: string, notified: boolean) {
  const p = await ownRenewal(id)
  if (!p) return
  await updatePrescription(p.id, { notifiedAt: notified ? new Date() : null })
  revalidatePath('/', 'layout')
}

export async function toggleRenewalNotified(formData: FormData) {
  const p = await ownRenewal(text(formData, 'id'))
  if (!p) return
  await updatePrescription(p.id, { notifiedAt: p.notifiedAt ? null : new Date() })
  revalidatePath('/', 'layout')
}

/** Renewed, or no longer needed: takes it off the list and stops the reminders. */
export async function closeRenewal(formData: FormData) {
  const p = await ownRenewal(text(formData, 'id'))
  if (!p) return
  await updatePrescription(p.id, { closedAt: new Date() })
  revalidatePath('/', 'layout')
}
