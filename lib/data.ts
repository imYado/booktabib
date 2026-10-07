import type { Localized } from './i18n'

// Fixed lists and shared types. Clinics and doctors themselves live in the database
// (lib/catalog.ts), where administrators edit them.

// The full list of medical specialties clinics and doctors can pick from.
export const specialties = {
  general: { en: 'General medicine', ar: 'طب عام', ckb: 'پزیشکی گشتی' },
  family: { en: 'Family medicine', ar: 'طب الأسرة', ckb: 'پزیشکی خێزان' },
  internal: { en: 'Internal medicine', ar: 'الطب الباطني', ckb: 'نەخۆشییەکانی ناوەوە' },
  emergency: { en: 'Emergency medicine', ar: 'طب الطوارئ', ckb: 'پزیشکی فریاکەوتن' },
  pediatrics: { en: 'Pediatrics', ar: 'طب الأطفال', ckb: 'پزیشکی منداڵان' },
  neonatology: { en: 'Neonatology', ar: 'طب حديثي الولادة', ckb: 'پزیشکی ساوایان' },
  geriatrics: { en: 'Geriatrics', ar: 'طب المسنين', ckb: 'پزیشکی بەساڵاچووان' },
  cardiology: { en: 'Cardiology', ar: 'أمراض القلب', ckb: 'نەخۆشییەکانی دڵ' },
  pulmonology: { en: 'Pulmonology (chest)', ar: 'الأمراض الصدرية', ckb: 'نەخۆشییەکانی سنگ و سی' },
  gastroenterology: { en: 'Gastroenterology', ar: 'الجهاز الهضمي والكبد', ckb: 'کۆئەندامی هەرس و جگەر' },
  endocrinology: { en: 'Endocrinology and diabetes', ar: 'الغدد الصماء والسكري', ckb: 'ڕژێنەکان و شەکرە' },
  nephrology: { en: 'Nephrology (kidneys)', ar: 'أمراض الكلى', ckb: 'نەخۆشییەکانی گورچیلە' },
  hematology: { en: 'Hematology', ar: 'أمراض الدم', ckb: 'نەخۆشییەکانی خوێن' },
  oncology: { en: 'Oncology', ar: 'الأورام', ckb: 'شێرپەنجە' },
  rheumatology: { en: 'Rheumatology', ar: 'الروماتيزم', ckb: 'ڕۆماتیزم' },
  infectious: { en: 'Infectious diseases', ar: 'الأمراض المعدية', ckb: 'نەخۆشییە گوازراوەکان' },
  allergy: { en: 'Allergy and immunology', ar: 'الحساسية والمناعة', ckb: 'هەستیاری و بەرگری' },
  neurology: { en: 'Neurology', ar: 'الأمراض العصبية', ckb: 'نەخۆشییەکانی دەمار' },
  psychiatry: { en: 'Psychiatry', ar: 'الطب النفسي', ckb: 'پزیشکی دەروونی' },
  psychology: { en: 'Psychology', ar: 'علم النفس', ckb: 'دەروونناسی' },
  dermatology: { en: 'Dermatology', ar: 'الأمراض الجلدية', ckb: 'نەخۆشییەکانی پێست' },
  cosmetic: { en: 'Cosmetic medicine', ar: 'الطب التجميلي', ckb: 'پزیشکی جوانکاری' },
  ophthalmology: { en: 'Ophthalmology', ar: 'طب العيون', ckb: 'چاو' },
  optometry: { en: 'Optometry', ar: 'فحص البصر', ckb: 'پشکنینی بینین' },
  ent: { en: 'Ear, nose and throat', ar: 'الأنف والأذن والحنجرة', ckb: 'گوێ و لووت و قوڕگ' },
  audiology: { en: 'Audiology (hearing)', ar: 'السمعيات', ckb: 'بیستن' },
  speech: { en: 'Speech therapy', ar: 'علاج النطق', ckb: 'چارەسەری ئاخاوتن' },
  dentistry: { en: 'Dentistry', ar: 'طب الأسنان', ckb: 'ددانسازی' },
  orthodontics: { en: 'Orthodontics', ar: 'تقويم الأسنان', ckb: 'ڕێکخستنی ددان' },
  oralSurgery: { en: 'Oral and maxillofacial surgery', ar: 'جراحة الفم والوجه والفكين', ckb: 'نەشتەرگەری دەم و ڕوخسار و شەویلگە' },
  gynecology: { en: 'Gynecology', ar: 'النسائية والتوليد', ckb: 'ئافرەتان و منداڵبوون' },
  fertility: { en: 'Fertility and IVF', ar: 'العقم وأطفال الأنابيب', ckb: 'نەزۆکی و منداڵی بۆری' },
  urology: { en: 'Urology', ar: 'المسالك البولية', ckb: 'میزەڕۆ' },
  andrology: { en: 'Andrology', ar: 'أمراض الذكورة', ckb: 'نەخۆشییەکانی پیاوان' },
  orthopedics: { en: 'Orthopedics', ar: 'العظام والمفاصل', ckb: 'ئێسک و جومگە' },
  sportsMedicine: { en: 'Sports medicine', ar: 'الطب الرياضي', ckb: 'پزیشکی وەرزشی' },
  physiotherapy: { en: 'Physiotherapy and rehabilitation', ar: 'العلاج الطبيعي والتأهيل', ckb: 'چارەسەری سروشتی و توانابەخشینەوە' },
  generalSurgery: { en: 'General surgery', ar: 'الجراحة العامة', ckb: 'نەشتەرگەری گشتی' },
  pediatricSurgery: { en: 'Pediatric surgery', ar: 'جراحة الأطفال', ckb: 'نەشتەرگەری منداڵان' },
  neurosurgery: { en: 'Neurosurgery', ar: 'جراحة الدماغ والأعصاب', ckb: 'نەشتەرگەری مێشک و دەمار' },
  cardiacSurgery: { en: 'Cardiac surgery', ar: 'جراحة القلب', ckb: 'نەشتەرگەری دڵ' },
  thoracicSurgery: { en: 'Thoracic surgery', ar: 'جراحة الصدر', ckb: 'نەشتەرگەری سنگ' },
  vascularSurgery: { en: 'Vascular surgery', ar: 'جراحة الأوعية الدموية', ckb: 'نەشتەرگەری بۆرییەکانی خوێن' },
  plasticSurgery: { en: 'Plastic surgery', ar: 'الجراحة التجميلية', ckb: 'نەشتەرگەری جوانکاری' },
  bariatricSurgery: { en: 'Bariatric surgery', ar: 'جراحة السمنة', ckb: 'نەشتەرگەری قەڵەوی' },
  anesthesiology: { en: 'Anesthesiology and pain', ar: 'التخدير وعلاج الألم', ckb: 'سڕکردن و چارەسەری ئازار' },
  radiology: { en: 'Radiology and imaging', ar: 'الأشعة والتصوير', ckb: 'تیشک و وێنەگرتن' },
  nuclearMedicine: { en: 'Nuclear medicine', ar: 'الطب النووي', ckb: 'پزیشکی ناوەکی' },
  laboratory: { en: 'Laboratory and pathology', ar: 'المختبر وعلم الأمراض', ckb: 'تاقیگە و نەخۆشیناسی' },
  nutrition: { en: 'Nutrition and dietetics', ar: 'التغذية', ckb: 'خۆراک و ژەمەخۆراک' },
  occupational: { en: 'Occupational medicine', ar: 'طب الصحة المهنية', ckb: 'پزیشکی پیشەیی' },
  publicHealth: { en: 'Public health', ar: 'الصحة العامة', ckb: 'تەندروستی گشتی' },
} satisfies Record<string, Localized>

export type SpecialtyId = keyof typeof specialties

/** Specialty ids in display order. */
export const specialtyIds = Object.keys(specialties) as SpecialtyId[]

/** Titles a doctor's name can start with. "other" lets the admin type their own. */
export const honorifics = {
  dr: { en: 'Dr.', ar: 'د.', ckb: 'د.' },
  prof: { en: 'Prof.', ar: 'أ.د.', ckb: 'پ.د.' },
  consultant: { en: 'Consultant', ar: 'استشاري', ckb: 'ڕاوێژکار' },
  specialist: { en: 'Specialist', ar: 'أخصائي', ckb: 'پسپۆڕ' },
  resident: { en: 'Resident', ar: 'طبيب مقيم', ckb: 'پزیشکی نیشتەجێ' },
  fellow: { en: 'Fellow', ar: 'زميل', ckb: 'فێلۆ' },
  mr: { en: 'Mr.', ar: 'السيد', ckb: 'بەڕێز' },
  ms: { en: 'Ms.', ar: 'الآنسة', ckb: 'خاتوو' },
  mrs: { en: 'Mrs.', ar: 'السيدة', ckb: 'خاتوو' },
} satisfies Record<string, Localized>

export type HonorificId = keyof typeof honorifics | 'none' | 'other'

export function isHonorific(v: unknown): v is HonorificId {
  return typeof v === 'string' && (v === 'none' || v === 'other' || v in honorifics)
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
  /** Texts exactly as the admin typed them; the ones above fill empty languages from another. */
  raw: { name: Localized; address: Localized; about: Localized }
}

export type Doctor = {
  id: string
  clinicId: string
  /** Full name as shown on the site, with the title in front (Dr. Sara Ahmed). */
  name: Localized
  honorific: HonorificId
  specialty: SpecialtyId
  title: Localized
  years: number
  fee: number
  room: string
  bio: Localized
  imageId: string | null
  sort: number
  raw: { name: Localized; title: Localized; bio: Localized; honorificOther: Localized }
}

const order = ['en', 'ar', 'ckb'] as const

/** Text as typed, in every language: empty languages show the first one that was written. */
export function localizedOrBlank(value: Partial<Localized> | null | undefined): Localized {
  return { en: value?.en ?? '', ar: value?.ar ?? '', ckb: value?.ckb ?? '' }
}

export function fillLocalized(value: Partial<Localized> | null | undefined): Localized {
  const v = localizedOrBlank(value)
  const first = order.map((l) => v[l].trim()).find(Boolean) ?? ''
  return { en: v.en.trim() || first, ar: v.ar.trim() || first, ckb: v.ckb.trim() || first }
}

/** A doctor's name with their title in front, in each language. */
export function titledName(name: Localized, honorific: HonorificId, other: Localized): Localized {
  const prefix = honorific === 'other' ? other : honorific === 'none' ? null : honorifics[honorific]
  const out = { ...name }
  if (prefix) for (const l of order) out[l] = [prefix[l], name[l]].filter(Boolean).join(' ')
  return out
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
