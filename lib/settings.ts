import 'server-only'
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { clinicSettings, doctorSettings } from '@/db/schema'
import { isAccent, type AccentId } from './accents'
import { getCatalog } from './catalog'
import { MINUTES_PER_PATIENT } from './data'
import { isLocale, type Locale } from './i18n'

export async function getClinicAccent(clinicId: string): Promise<AccentId> {
  const db = await getDb()
  const [row] = await db.select().from(clinicSettings).where(eq(clinicSettings.clinicId, clinicId)).limit(1)
  return isAccent(row?.accent) ? row.accent : 'paper'
}

/** The language the clinic's TV screen is shown in: Arabic unless the clinic picked another. */
export async function getScreenLocale(clinicId: string): Promise<Locale> {
  const db = await getDb()
  const [row] = await db.select().from(clinicSettings).where(eq(clinicSettings.clinicId, clinicId)).limit(1)
  return isLocale(row?.screenLocale) ? row.screenLocale : 'ar'
}

export async function setScreenLocale(clinicId: string, screenLocale: Locale) {
  const db = await getDb()
  await db
    .insert(clinicSettings)
    .values({ clinicId, screenLocale })
    .onConflictDoUpdate({ target: clinicSettings.clinicId, set: { screenLocale } })
}

/** Accent of every clinic that has chosen one, for lists of clinic cards. */
export async function getClinicAccents(): Promise<Record<string, AccentId>> {
  const db = await getDb()
  const rows = await db.select().from(clinicSettings)
  return Object.fromEntries(rows.filter((r) => isAccent(r.accent)).map((r) => [r.clinicId, r.accent as AccentId]))
}

export async function setClinicAccent(clinicId: string, accent: AccentId) {
  const db = await getDb()
  await db
    .insert(clinicSettings)
    .values({ clinicId, accent })
    .onConflictDoUpdate({ target: clinicSettings.clinicId, set: { accent } })
}

export async function getDoctorWhatsapps(doctorIds: string[]): Promise<Record<string, string>> {
  if (!doctorIds.length) return {}
  const db = await getDb()
  const rows = await db.select().from(doctorSettings).where(inArray(doctorSettings.doctorId, doctorIds))
  return Object.fromEntries(rows.filter((r) => r.whatsapp).map((r) => [r.doctorId, r.whatsapp]))
}

export async function setDoctorWhatsapp(doctorId: string, whatsapp: string) {
  const db = await getDb()
  await db
    .insert(doctorSettings)
    .values({ doctorId, whatsapp })
    .onConflictDoUpdate({ target: doctorSettings.doctorId, set: { whatsapp } })
}

/** How long each doctor's visits usually take, in minutes (15 unless the clinic changed it). */
export async function getVisitMinutes(doctorIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = Object.fromEntries(doctorIds.map((id) => [id, MINUTES_PER_PATIENT]))
  if (!doctorIds.length) return out
  const db = await getDb()
  const rows = await db.select().from(doctorSettings).where(inArray(doctorSettings.doctorId, doctorIds))
  for (const r of rows) out[r.doctorId] = r.visitMinutes
  return out
}

export async function setVisitMinutes(doctorId: string, visitMinutes: number) {
  const db = await getDb()
  await db
    .insert(doctorSettings)
    .values({ doctorId, visitMinutes })
    .onConflictDoUpdate({ target: doctorSettings.doctorId, set: { visitMinutes } })
}

/** The number a patient's live link sends WhatsApp messages to: the doctor's own, else the clinic's. */
export async function contactNumberFor(doctorId: string): Promise<string | null> {
  const own = (await getDoctorWhatsapps([doctorId]))[doctorId]
  const { getClinic, getDoctor } = await getCatalog()
  return own || (getClinic(getDoctor(doctorId)?.clinicId ?? '')?.phone ?? null)
}
