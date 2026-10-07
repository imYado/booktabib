import type { Localized } from './i18n'

// Fixed lists and shared types. Clinics and doctors themselves live in the database
// (lib/catalog.ts), where administrators edit them.

export type SpecialtyId =
  | 'general'
  | 'pediatrics'
  | 'dentistry'
  | 'cardiology'
  | 'dermatology'
  | 'gynecology'
  | 'orthopedics'
  | 'ophthalmology'

export const specialties: Record<SpecialtyId, Localized> = {
  general: { en: 'General medicine', ar: 'طب عام', ckb: 'پزیشکی گشتی' },
  pediatrics: { en: 'Pediatrics', ar: 'طب الأطفال', ckb: 'پزیشکی منداڵان' },
  dentistry: { en: 'Dentistry', ar: 'طب الأسنان', ckb: 'ددانسازی' },
  cardiology: { en: 'Cardiology', ar: 'أمراض القلب', ckb: 'نەخۆشییەکانی دڵ' },
  dermatology: { en: 'Dermatology', ar: 'الأمراض الجلدية', ckb: 'نەخۆشییەکانی پێست' },
  gynecology: { en: 'Gynecology', ar: 'النسائية والتوليد', ckb: 'ئافرەتان و منداڵبوون' },
  orthopedics: { en: 'Orthopedics', ar: 'العظام والمفاصل', ckb: 'ئێسک و جومگە' },
  ophthalmology: { en: 'Ophthalmology', ar: 'طب العيون', ckb: 'چاو' },
}

export type CityId = 'erbil' | 'sulaymaniyah' | 'duhok' | 'baghdad'

export const cities: Record<CityId, Localized> = {
  erbil: { en: 'Erbil', ar: 'أربيل', ckb: 'هەولێر' },
  sulaymaniyah: { en: 'Sulaymaniyah', ar: 'السليمانية', ckb: 'سلێمانی' },
  duhok: { en: 'Duhok', ar: 'دهوك', ckb: 'دهۆک' },
  baghdad: { en: 'Baghdad', ar: 'بغداد', ckb: 'بەغدا' },
}

export type Clinic = {
  id: string
  name: Localized
  city: CityId
  address: Localized
  phone: string
  /** Map pin for directions. */
  location: { lat: number; lng: number }
  rating: number
  reviews: number
  specialties: SpecialtyId[]
  about: Localized
  imageId: string | null
}

export type Doctor = {
  id: string
  clinicId: string
  name: Localized
  specialty: SpecialtyId
  title: Localized
  years: number
  fee: number
  room: string
  bio: Localized
  imageId: string | null
  sort: number
}

export function isCity(v: unknown): v is CityId {
  return typeof v === 'string' && v in cities
}

export function isSpecialty(v: unknown): v is SpecialtyId {
  return typeof v === 'string' && v in specialties
}

/** Average length of a visit, used to estimate when a patient will be seen. */
export const MINUTES_PER_PATIENT = 15

/** Appointment times offered each working day. */
export const dailySlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00']

/** Clinics are closed on Fridays. */
export function isWorkingDay(iso: string) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay() !== 5
}

/** Turns a local Iraqi number (07xx...) or an international one into digits for wa.me links. */
export function whatsappNumber(phone: string) {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `964${digits.slice(1)}`
  return digits
}
