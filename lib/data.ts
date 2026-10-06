import type { Localized } from './i18n'

// Placeholder sample data so the site can be previewed. Every clinic and
// doctor here is fictional and will be replaced by real records.

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
  rating: number
  reviews: number
  specialties: SpecialtyId[]
  about: Localized
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
}

export const clinics: Clinic[] = [
  {
    id: 'shifa-family-clinic',
    name: { en: 'Shifa Family Clinic', ar: 'عيادة الشفاء العائلية', ckb: 'کلینیکی خێزانی شیفا' },
    city: 'erbil',
    address: { en: '100m Street, Ankawa, Erbil', ar: 'شارع 100 متر، عنكاوا، أربيل', ckb: 'شەقامی ١٠٠ مەتری، عەنکاوە، هەولێر' },
    phone: '+964 750 000 0101',
    rating: 4.8,
    reviews: 214,
    specialties: ['general', 'pediatrics'],
    about: {
      en: 'A neighbourhood family practice for adults and children, with same-week appointments.',
      ar: 'عيادة عائلية للكبار والأطفال مع مواعيد خلال الأسبوع نفسه.',
      ckb: 'کلینیکێکی خێزانی بۆ گەورە و منداڵ، بە نۆرە لە هەمان هەفتەدا.',
    },
  },
  {
    id: 'azadi-dental-studio',
    name: { en: 'Azadi Dental Studio', ar: 'استوديو آزادي لطب الأسنان', ckb: 'ستۆدیۆی ددانی ئازادی' },
    city: 'sulaymaniyah',
    address: { en: 'Salim Street, Sulaymaniyah', ar: 'شارع سالم، السليمانية', ckb: 'شەقامی سالم، سلێمانی' },
    phone: '+964 770 000 0202',
    rating: 4.9,
    reviews: 341,
    specialties: ['dentistry'],
    about: {
      en: 'Check-ups, fillings, and cosmetic dentistry in a calm, modern studio.',
      ar: 'فحوصات وحشوات وتجميل أسنان في عيادة هادئة وحديثة.',
      ckb: 'پشکنین، پڕکردنەوە و جوانکاری ددان لە ستۆدیۆیەکی هێمن و نوێدا.',
    },
  },
  {
    id: 'nabd-heart-center',
    name: { en: 'Nabd Heart Center', ar: 'مركز نبض للقلب', ckb: 'سەنتەری دڵی نەبز' },
    city: 'baghdad',
    address: { en: 'Al-Mansour, Baghdad', ar: 'المنصور، بغداد', ckb: 'مەنسوور، بەغدا' },
    phone: '+964 780 000 0303',
    rating: 4.7,
    reviews: 158,
    specialties: ['cardiology', 'general'],
    about: {
      en: 'Heart check-ups, ECG, and follow-up care with experienced cardiologists.',
      ar: 'فحوصات القلب وتخطيط القلب والمتابعة مع أطباء قلب ذوي خبرة.',
      ckb: 'پشکنینی دڵ، ئێ سی جی و چاودێری بەردەوام لەگەڵ پزیشکی دڵی بە ئەزموون.',
    },
  },
  {
    id: 'roj-skin-clinic',
    name: { en: 'Roj Skin Clinic', ar: 'عيادة روژ للجلدية', ckb: 'کلینیکی پێستی ڕۆژ' },
    city: 'erbil',
    address: { en: 'Gulan Street, Erbil', ar: 'شارع گولان، أربيل', ckb: 'شەقامی گوڵان، هەولێر' },
    phone: '+964 750 000 0404',
    rating: 4.6,
    reviews: 97,
    specialties: ['dermatology'],
    about: {
      en: 'Medical and cosmetic dermatology for all skin types.',
      ar: 'طب الجلدية العلاجي والتجميلي لجميع أنواع البشرة.',
      ckb: 'چارەسەری پزیشکی و جوانکاری پێست بۆ هەموو جۆرە پێستێک.',
    },
  },
  {
    id: 'dayik-womens-health',
    name: { en: 'Dayik Women’s Health', ar: 'دايك لصحة المرأة', ckb: 'دایک بۆ تەندروستی ئافرەتان' },
    city: 'duhok',
    address: { en: 'Kawa Street, Duhok', ar: 'شارع كاوا، دهوك', ckb: 'شەقامی کاوە، دهۆک' },
    phone: '+964 750 000 0505',
    rating: 4.8,
    reviews: 186,
    specialties: ['gynecology', 'pediatrics'],
    about: {
      en: 'Women’s health, pregnancy care, and newborn check-ups under one roof.',
      ar: 'صحة المرأة ورعاية الحمل وفحص حديثي الولادة في مكان واحد.',
      ckb: 'تەندروستی ئافرەتان، چاودێری دووگیانی و پشکنینی منداڵی تازە لەدایکبوو لە یەک شوێندا.',
    },
  },
  {
    id: 'chra-eye-and-bone',
    name: { en: 'Chra Eye & Bone Clinic', ar: 'عيادة چرا للعيون والعظام', ckb: 'کلینیکی چرا بۆ چاو و ئێسک' },
    city: 'sulaymaniyah',
    address: { en: 'Bakhtiari, Sulaymaniyah', ar: 'بختياري، السليمانية', ckb: 'بەختیاری، سلێمانی' },
    phone: '+964 770 000 0606',
    rating: 4.5,
    reviews: 73,
    specialties: ['ophthalmology', 'orthopedics'],
    about: {
      en: 'Eye exams, vision care, and joint and bone consultations.',
      ar: 'فحص النظر ورعاية العيون واستشارات العظام والمفاصل.',
      ckb: 'پشکنینی چاو، چاودێری بینین و ڕاوێژی ئێسک و جومگە.',
    },
  },
]

export const doctors: Doctor[] = [
  {
    id: 'dr-sara-ahmed',
    clinicId: 'shifa-family-clinic',
    name: { en: 'Dr. Sara Ahmed', ar: 'د. سارة أحمد', ckb: 'د. سارا ئەحمەد' },
    specialty: 'general',
    title: { en: 'Family physician', ar: 'طبيبة عائلة', ckb: 'پزیشکی خێزان' },
    years: 12,
    fee: 25000,
    room: '1',
    bio: {
      en: 'Focuses on preventive care and long-term follow-up for whole families.',
      ar: 'تركّز على الرعاية الوقائية والمتابعة طويلة الأمد للعائلات.',
      ckb: 'سەرنج دەخاتە سەر چاودێری پێشوەختە و بەدواداچوونی درێژخایەن بۆ خێزانەکان.',
    },
  },
  {
    id: 'dr-karwan-aziz',
    clinicId: 'shifa-family-clinic',
    name: { en: 'Dr. Karwan Aziz', ar: 'د. كاروان عزيز', ckb: 'د. کاروان عەزیز' },
    specialty: 'pediatrics',
    title: { en: 'Pediatrician', ar: 'طبيب أطفال', ckb: 'پزیشکی منداڵان' },
    years: 9,
    fee: 25000,
    room: '2',
    bio: {
      en: 'Cares for newborns to teenagers, including vaccinations and growth checks.',
      ar: 'يعتني بالأطفال من حديثي الولادة حتى المراهقة، بما في ذلك اللقاحات وفحوص النمو.',
      ckb: 'چاودێری منداڵان دەکات لە تازە لەدایکبووەوە تا هەرزەکاری، لەوانە کوتان و پشکنینی گەشە.',
    },
  },
  {
    id: 'dr-hana-rashid',
    clinicId: 'azadi-dental-studio',
    name: { en: 'Dr. Hana Rashid', ar: 'د. هناء رشيد', ckb: 'د. هانا ڕەشید' },
    specialty: 'dentistry',
    title: { en: 'Dentist', ar: 'طبيبة أسنان', ckb: 'پزیشکی ددان' },
    years: 8,
    fee: 20000,
    room: 'A',
    bio: {
      en: 'Gentle general dentistry with a special interest in anxious patients.',
      ar: 'طب أسنان عام بلطف مع اهتمام خاص بالمرضى القلقين.',
      ckb: 'ددانسازی گشتی بە نەرمی، بە گرنگییەکی تایبەت بە نەخۆشە دڵەڕاوکێکان.',
    },
  },
  {
    id: 'dr-omar-salih',
    clinicId: 'azadi-dental-studio',
    name: { en: 'Dr. Omar Salih', ar: 'د. عمر صالح', ckb: 'د. عومەر ساڵح' },
    specialty: 'dentistry',
    title: { en: 'Orthodontist', ar: 'أخصائي تقويم الأسنان', ckb: 'پسپۆڕی ڕێکخستنی ددان' },
    years: 14,
    fee: 30000,
    room: 'B',
    bio: {
      en: 'Braces and clear aligners for children and adults.',
      ar: 'تقويم الأسنان والقوالب الشفافة للأطفال والبالغين.',
      ckb: 'ڕێکخەری ددان و قاڵبی ڕوون بۆ منداڵان و گەورەکان.',
    },
  },
  {
    id: 'dr-layla-hassan',
    clinicId: 'nabd-heart-center',
    name: { en: 'Dr. Layla Hassan', ar: 'د. ليلى حسن', ckb: 'د. لەیلا حەسەن' },
    specialty: 'cardiology',
    title: { en: 'Cardiologist', ar: 'أخصائية قلب', ckb: 'پسپۆڕی دڵ' },
    years: 18,
    fee: 40000,
    room: '3',
    bio: {
      en: 'Hypertension, heart rhythm problems, and cardiac follow-up.',
      ar: 'ارتفاع ضغط الدم واضطرابات نظم القلب ومتابعة مرضى القلب.',
      ckb: 'فشاری خوێنی بەرز، تێکچوونی لێدانی دڵ و بەدواداچوونی نەخۆشانی دڵ.',
    },
  },
  {
    id: 'dr-yusuf-karim',
    clinicId: 'nabd-heart-center',
    name: { en: 'Dr. Yusuf Karim', ar: 'د. يوسف كريم', ckb: 'د. یووسف کەریم' },
    specialty: 'general',
    title: { en: 'Internal medicine', ar: 'باطنية', ckb: 'نەخۆشییە ناوەکییەکان' },
    years: 11,
    fee: 25000,
    room: '1',
    bio: {
      en: 'Diabetes, cholesterol, and general adult health.',
      ar: 'السكري والكولسترول والصحة العامة للبالغين.',
      ckb: 'شەکرە، کۆلیسترۆڵ و تەندروستی گشتی گەورەکان.',
    },
  },
  {
    id: 'dr-nasrin-jalal',
    clinicId: 'roj-skin-clinic',
    name: { en: 'Dr. Nasrin Jalal', ar: 'د. نسرين جلال', ckb: 'د. نەسرین جەلال' },
    specialty: 'dermatology',
    title: { en: 'Dermatologist', ar: 'أخصائية جلدية', ckb: 'پسپۆڕی پێست' },
    years: 10,
    fee: 30000,
    room: '2',
    bio: {
      en: 'Acne, eczema, and skin checks, plus cosmetic treatments.',
      ar: 'حب الشباب والإكزيما وفحص الجلد، إضافة إلى العلاجات التجميلية.',
      ckb: 'زیپکە، ئێگزیما و پشکنینی پێست، لەگەڵ چارەسەری جوانکاری.',
    },
  },
  {
    id: 'dr-avin-mustafa',
    clinicId: 'dayik-womens-health',
    name: { en: 'Dr. Avin Mustafa', ar: 'د. آفين مصطفى', ckb: 'د. ئاڤین مستەفا' },
    specialty: 'gynecology',
    title: { en: 'Obstetrician and gynecologist', ar: 'أخصائية نسائية وتوليد', ckb: 'پسپۆڕی ئافرەتان و منداڵبوون' },
    years: 15,
    fee: 35000,
    room: '1',
    bio: {
      en: 'Pregnancy care, ultrasound, and women’s health at every age.',
      ar: 'رعاية الحمل والسونار وصحة المرأة في كل الأعمار.',
      ckb: 'چاودێری دووگیانی، سۆنار و تەندروستی ئافرەتان لە هەموو تەمەنێکدا.',
    },
  },
  {
    id: 'dr-rebin-faraj',
    clinicId: 'dayik-womens-health',
    name: { en: 'Dr. Rebin Faraj', ar: 'د. ريبين فرج', ckb: 'د. ڕێبین فەرەج' },
    specialty: 'pediatrics',
    title: { en: 'Neonatologist', ar: 'أخصائي حديثي الولادة', ckb: 'پسپۆڕی منداڵی تازە لەدایکبوو' },
    years: 7,
    fee: 25000,
    room: '2',
    bio: {
      en: 'Newborn check-ups and early childhood care.',
      ar: 'فحص حديثي الولادة ورعاية الطفولة المبكرة.',
      ckb: 'پشکنینی منداڵی تازە لەدایکبوو و چاودێری منداڵی بچووک.',
    },
  },
  {
    id: 'dr-dilan-sherwan',
    clinicId: 'chra-eye-and-bone',
    name: { en: 'Dr. Dilan Sherwan', ar: 'د. ديلان شيروان', ckb: 'د. دیلان شێروان' },
    specialty: 'ophthalmology',
    title: { en: 'Ophthalmologist', ar: 'أخصائي عيون', ckb: 'پسپۆڕی چاو' },
    years: 13,
    fee: 30000,
    room: '1',
    bio: {
      en: 'Eye exams, glasses prescriptions, and cataract assessment.',
      ar: 'فحص العيون ووصف النظارات وتقييم الماء الأبيض.',
      ckb: 'پشکنینی چاو، نووسینی چاویلکە و هەڵسەنگاندنی ئاوی سپی.',
    },
  },
  {
    id: 'dr-bakhtiyar-ali',
    clinicId: 'chra-eye-and-bone',
    name: { en: 'Dr. Bakhtiyar Ali', ar: 'د. بختيار علي', ckb: 'د. بەختیار عەلی' },
    specialty: 'orthopedics',
    title: { en: 'Orthopedic surgeon', ar: 'جرّاح عظام', ckb: 'نەشتەرگەری ئێسک' },
    years: 16,
    fee: 35000,
    room: '2',
    bio: {
      en: 'Back pain, sports injuries, and joint problems.',
      ar: 'آلام الظهر وإصابات الرياضة ومشاكل المفاصل.',
      ckb: 'ئازاری پشت، برینداربوونی وەرزشی و کێشەکانی جومگە.',
    },
  },
]

export function getClinic(id: string) {
  return clinics.find((c) => c.id === id)
}

export function getDoctor(id: string) {
  return doctors.find((d) => d.id === id)
}

export function doctorsAt(clinicId: string) {
  return doctors.filter((d) => d.clinicId === clinicId)
}

/** Appointment times offered each working day. */
export const dailySlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00']

/** Clinics are closed on Fridays. */
export function isWorkingDay(iso: string) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay() !== 5
}
