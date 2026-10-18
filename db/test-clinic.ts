import { and, asc, eq, gt, gte, inArray, isNull, ne, sql } from 'drizzle-orm'
import { dailySlots, isWorkingDay } from '../lib/data'
import { addDays, todayISO } from '../lib/format'
import { randomId } from '../lib/ids'
import type { DB } from './index'
import {
  bookings,
  clinicRatings,
  clinicSettings,
  clinics,
  doctors,
  favorites,
  notifications,
  prescriptions,
  users,
  type BookingStatus,
  type DoctorService,
} from './schema'

// A test clinic that looks as if it has been on the site for two weeks: two doctors, staff and
// patient logins, past visits, today's line, upcoming bookings, ratings and renewals. Added once on
// deploy (scripts/seed-test-clinic.ts); remove it by deleting the clinic and the accounts below.

export const TEST_CLINIC_ID = 'rezan-medical-center'

// The logins share one password, given to the owner outside the repository. Only its hash is here.
const PASSWORD_HASH = 'scrypt$ZJhzZsfNA0AE6m9IZEcpUg==$p3WpJ+d7LkojE5HzvJnndsal/o/hN2yj74UpYmeIbu8cHy9JyDfCOXa3pnItgUhPPvIH/wE4He4af3m+c3HQQA=='
// Stand-in patients who rated the clinic. This hash can't match any password, so they can't sign in.
const NO_LOGIN = 'disabled'

export const TEST_ACCOUNTS = {
  doctor: 'rezan.doctor@example.com',
  doctor2: 'lana.doctor@example.com',
  assistant: 'rezan.assistant@example.com',
  patient: 'rezan.patient@example.com',
}

const DR_REZAN = 'dr-rezan-hawrami'
const DR_LANA = 'dr-lana-barzani'

const services: Record<string, DoctorService[]> = {
  [DR_REZAN]: [
    { name: { en: 'Consultation', ar: 'استشارة', ckb: 'ڕاوێژ' }, fee: 25000 },
    { name: { en: 'Follow-up visit', ar: 'مراجعة', ckb: 'سەردانی دووبارە' }, fee: 15000 },
    { name: { en: 'Diabetes check with tests', ar: 'فحص السكري مع التحاليل', ckb: 'پشکنینی شەکرە لەگەڵ شیکاری' }, fee: 40000 },
  ],
  [DR_LANA]: [
    { name: { en: 'Consultation', ar: 'استشارة', ckb: 'ڕاوێژ' }, fee: 20000 },
    { name: { en: 'Child check-up', ar: 'فحص الطفل', ckb: 'پشکنینی منداڵ' }, fee: 20000 },
    { name: { en: 'Vaccination', ar: 'تلقيح', ckb: 'کوتان' }, fee: 10000 },
  ],
}

const names = [
  'Aram Kamal', 'Shilan Omar', 'أحمد جاسم', 'Zhwan Ali', 'فاطمة حسين', 'Rawa Sabir', 'Hezha Majid', 'زينب كريم',
  'Lana Fattah', 'Diyar Hama', 'مريم سعد', 'Soran Qadir', 'Kani Aziz', 'علي حسن', 'Bestun Rauf', 'نور الهدى',
  'Chiman Salar', 'Halo Mahmud', 'سارة ياسين', 'Nyan Karim', 'Awat Hussein', 'هبة عادل', 'Shene Rasul', 'Dara Jamal',
  'رنا فاضل', 'Karzan Omer', 'Bahar Nawzad', 'حسين علي', 'Sana Rebwar', 'Goran Salih', 'دعاء محمد', 'Rebin Anwar',
]

/** Same "random" data on every run, so the clinic looks the same wherever it is seeded. */
function generator(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

const at = (date: string, time: string) => new Date(`${date}T${time}:00+03:00`)
const earlier = (a: Date, b: Date) => (a < b ? a : b)

export async function seedTestClinic(db: DB) {
  const existing = await db.select({ id: clinics.id }).from(clinics).where(eq(clinics.id, TEST_CLINIC_ID))
  if (!existing.length) {
    try {
      await insertAll(db)
    } catch (err) {
      // Neon's HTTP driver has no transactions, so undo a half-finished run; the next deploy tries again.
      await removeTestClinic(db).catch(() => {})
      throw err
    }
  }
  // Also fills in a clinic seeded before the doctor's charts existed.
  await addChartData(db)
  return !existing.length
}

/**
 * Data for the doctor's charts: how long each finished visit took, and patients whose prescription came
 * due and who came back through the renewal link. Only touches what is still missing, so it can run on
 * every deploy.
 */
async function addChartData(db: DB) {
  const rand = generator(714)
  const minutesFor: Record<string, [number, number]> = { [DR_REZAN]: [9, 12], [DR_LANA]: [12, 14] }

  const untimed = await db
    .select({ id: bookings.id, doctorId: bookings.doctorId, date: bookings.date, time: bookings.time, position: bookings.position })
    .from(bookings)
    .where(and(eq(bookings.clinicId, TEST_CLINIC_ID), eq(bookings.status, 'done'), isNull(bookings.finishedAt)))
  if (untimed.length) {
    const values = untimed.map((b) => {
      const time = b.position === null ? b.time : `${String(Math.floor(b.position / 60)).padStart(2, '0')}:${String(Math.floor(b.position % 60)).padStart(2, '0')}`
      const called = at(b.date, time).getTime() + Math.floor(rand() * 15) * 60_000
      const [shortest, spread] = minutesFor[b.doctorId] ?? [10, 10]
      const finished = called + (shortest + Math.floor(rand() * spread)) * 60_000 + Math.floor(rand() * 60) * 1000
      return sql`(${b.id}, ${called}::bigint, ${finished}::bigint)`
    })
    await db.execute(sql`
      update ${bookings} set called_at = v.called, finished_at = v.finished
      from (values ${sql.join(values, sql`, `)}) as v(id, called, finished)
      where ${bookings.id} = v.id`)
  }

  // Patients whose prescription came due since the clinic opened. Most came back through the link.
  const [marker] = await db
    .select({ id: prescriptions.id })
    .from(prescriptions)
    .where(and(eq(prescriptions.clinicId, TEST_CLINIC_ID), eq(prescriptions.patientName, 'Dilan Omer')))
  if (marker) return
  const today = todayISO()
  const [{ opened }] = await db.select({ opened: clinics.createdAt }).from(clinics).where(eq(clinics.id, TEST_CLINIC_ID))
  const [assistant] = await db.select({ id: users.id }).from(users).where(eq(users.email, TEST_ACCOUNTS.assistant))
  const due = [
    { name: 'Dilan Omer', doctorId: DR_REZAN, came: true },
    { name: 'هدى صالح', doctorId: DR_REZAN, came: true },
    { name: 'Saman Aziz', doctorId: DR_LANA, came: true },
    { name: 'Bnar Jalal', doctorId: DR_REZAN, came: false },
    { name: 'كريم عباس', doctorId: DR_LANA, came: true },
    { name: 'Hana Rashid', doctorId: DR_REZAN, came: true },
    { name: 'Peshraw Ali', doctorId: DR_LANA, came: false },
    { name: 'ليلى منصور', doctorId: DR_REZAN, came: true },
    { name: 'Rozh Fuad', doctorId: DR_LANA, came: true },
    { name: 'Ari Hassan', doctorId: DR_REZAN, came: false },
  ]
  const openedDay = opened.toISOString().slice(0, 10)
  for (const [i, p] of due.entries()) {
    const added = addDays(openedDay, i % 4)
    const renewOn = [addDays(added, 6 + (i % 5)), addDays(today, -1 - (i % 3))].sort()[0]
    if (renewOn >= today) continue
    const id = randomId(16)
    const phone = `0751${String(Math.floor(rand() * 10_000_000)).padStart(7, '0')}`
    await db.insert(prescriptions).values({
      id,
      clinicId: TEST_CLINIC_ID,
      doctorId: p.doctorId,
      patientName: p.name,
      phone,
      renewOn,
      createdBy: assistant?.id ?? null,
      createdAt: at(added, '12:30'),
      notifiedAt: at(addDays(renewOn, -2), '10:00'),
      closedAt: p.came ? at(renewOn, '13:00') : null,
    })
    if (!p.came) continue
    // Their return visit: one of the doctor's bookings from around the renewal date, now theirs.
    const [visit] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.clinicId, TEST_CLINIC_ID),
          eq(bookings.doctorId, p.doctorId),
          ne(bookings.status, 'cancelled'),
          isNull(bookings.userId),
          isNull(bookings.prescriptionId),
          gte(bookings.date, addDays(renewOn, -3)),
          gt(bookings.createdAt, at(added, '12:30')),
        ),
      )
      .orderBy(asc(bookings.date), asc(bookings.time))
      .limit(1)
    if (visit) await db.update(bookings).set({ prescriptionId: id, patientName: p.name, phone }).where(eq(bookings.id, visit.id))
  }
}

export async function removeTestClinic(db: DB) {
  await db.delete(bookings).where(eq(bookings.clinicId, TEST_CLINIC_ID))
  await db.delete(prescriptions).where(eq(prescriptions.clinicId, TEST_CLINIC_ID))
  await db.delete(notifications).where(eq(notifications.clinicId, TEST_CLINIC_ID))
  await db.delete(clinicSettings).where(eq(clinicSettings.clinicId, TEST_CLINIC_ID))
  await db.delete(users).where(inArray(users.email, [...Object.values(TEST_ACCOUNTS), ...raterEmails()]))
  await db.delete(clinics).where(eq(clinics.id, TEST_CLINIC_ID))
}

const raterEmails = () => Array.from({ length: 12 }, (_, i) => `rezan.rater${i + 1}@example.com`)

async function insertAll(db: DB) {
  const rand = generator(2026)
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)]
  const today = todayISO()
  const opened = addDays(today, -14)

  await db.insert(clinics).values({
    id: TEST_CLINIC_ID,
    name: { en: 'Rezan Medical Center', ar: 'مركز ريزان الطبي', ckb: 'سەنتەری پزیشکی ڕێزان' },
    city: 'erbil',
    address: { en: '60m Street, near Family Mall, Erbil', ar: 'شارع 60 متر، قرب فاميلي مول، أربيل', ckb: 'شەقامی ٦٠ مەتری، نزیک فامیلی مۆڵ، هەولێر' },
    phone: '07501234567',
    lat: 36.2065,
    lng: 44.0389,
    specialties: ['internal', 'endocrinology', 'pediatrics'],
    about: {
      en: 'Internal medicine, diabetes care and children’s check-ups, with a small lab on site.',
      ar: 'الطب الباطني ورعاية السكري وفحوص الأطفال، مع مختبر صغير داخل المركز.',
      ckb: 'نەخۆشییەکانی ناوەوە، چاودێری شەکرە و پشکنینی منداڵان، لەگەڵ تاقیگەیەکی بچووک لە ناو سەنتەرەکەدا.',
    },
    createdAt: at(opened, '10:00'),
  })
  await db.insert(clinicSettings).values({ clinicId: TEST_CLINIC_ID, accent: 'sky' }).onConflictDoNothing()

  const lowest = (id: string) => Math.min(...services[id].map((s) => s.fee))
  await db.insert(doctors).values([
    {
      id: DR_REZAN,
      clinicId: TEST_CLINIC_ID,
      name: { en: 'Rezan Hawrami', ar: 'ريزان هورامي', ckb: 'ڕێزان هەورامی' },
      honorific: 'dr',
      specialty: 'internal',
      title: { en: 'Internal medicine and diabetes', ar: 'باطنية وسكري', ckb: 'ناوەوە و شەکرە' },
      years: 14,
      fee: lowest(DR_REZAN),
      services: services[DR_REZAN],
      room: '1',
      bio: {
        en: 'Looks after adults with diabetes, blood pressure and thyroid problems, with regular follow-up.',
        ar: 'يتابع البالغين المصابين بالسكري وضغط الدم ومشاكل الغدة الدرقية بمراجعات منتظمة.',
        ckb: 'چاودێری گەورەساڵانی تووشبوو بە شەکرە، پەستانی خوێن و کێشەی سپڵ دەکات، بە بەدواداچوونی بەردەوام.',
      },
      sort: 0,
    },
    {
      id: DR_LANA,
      clinicId: TEST_CLINIC_ID,
      name: { en: 'Lana Barzani', ar: 'لانا بارزاني', ckb: 'لانا بارزانی' },
      honorific: 'dr',
      specialty: 'pediatrics',
      title: { en: 'Pediatrician', ar: 'طبيبة أطفال', ckb: 'پزیشکی منداڵان' },
      years: 8,
      fee: lowest(DR_LANA),
      services: services[DR_LANA],
      room: '2',
      bio: {
        en: 'Sees children from birth to 15, including vaccinations and growth checks.',
        ar: 'تعالج الأطفال من الولادة حتى 15 سنة، بما في ذلك اللقاحات وفحوص النمو.',
        ckb: 'منداڵان لە لەدایکبوونەوە تا ١٥ ساڵ دەبینێت، لەوانە کوتان و پشکنینی گەشە.',
      },
      sort: 1,
    },
  ])

  const id = { doctor: randomId(16), doctor2: randomId(16), assistant: randomId(16), patient: randomId(16) }
  const patientPhone = '07507654321'
  await db.insert(users).values([
    { id: id.doctor, email: TEST_ACCOUNTS.doctor, name: 'Dr. Rezan Hawrami', role: 'doctor', clinicId: TEST_CLINIC_ID, doctorId: DR_REZAN, passwordHash: PASSWORD_HASH, createdAt: at(opened, '10:05') },
    { id: id.doctor2, email: TEST_ACCOUNTS.doctor2, name: 'Dr. Lana Barzani', role: 'doctor', clinicId: TEST_CLINIC_ID, doctorId: DR_LANA, passwordHash: PASSWORD_HASH, createdAt: at(opened, '10:06') },
    { id: id.assistant, email: TEST_ACCOUNTS.assistant, name: 'Shno Ahmed', role: 'assistant', clinicId: TEST_CLINIC_ID, passwordHash: PASSWORD_HASH, createdAt: at(opened, '10:10') },
    { id: id.patient, email: TEST_ACCOUNTS.patient, name: 'Hawre Salih', role: 'patient', phone: patientPhone, gender: 'male', birthDate: '1988-04-17', passwordHash: PASSWORD_HASH, createdAt: at(addDays(opened, 2), '18:20') },
  ])

  // Patients who booked here and left a rating.
  const raters = raterEmails().map((email, i) => ({ id: randomId(16), email, name: names[i], role: 'patient' as const, passwordHash: NO_LOGIN, createdAt: at(addDays(opened, i % 10), '12:00') }))
  await db.insert(users).values(raters)
  const stars = [5, 5, 4, 5, 5, 4, 5, 3, 5, 4, 5, 5]
  await db.insert(clinicRatings).values([
    ...raters.map((u, i) => ({ userId: u.id, clinicId: TEST_CLINIC_ID, stars: stars[i], updatedAt: at(addDays(opened, 1 + i), '20:00') })),
    { userId: id.patient, clinicId: TEST_CLINIC_ID, stars: 5, updatedAt: at(addDays(today, -5), '19:00') },
  ])
  await db.insert(favorites).values({ userId: id.patient, clinicId: TEST_CLINIC_ID, createdAt: at(addDays(today, -12), '19:30') })

  // Bookings: two weeks of finished visits, today's line, and the week ahead.
  const rows: (typeof bookings.$inferInsert)[] = []
  const tickets = new Map<string, number>()
  const phone = () => `0750${String(Math.floor(rand() * 10_000_000)).padStart(7, '0')}`
  type Extra = { userId?: string; patientName?: string; phone?: string; walkIn?: boolean; position?: number; calledAt?: number }
  const add = (doctorId: string, date: string, time: string, status: BookingStatus, extra: Extra = {}) => {
    const ticket = status === 'pending' || status === 'cancelled' ? null : (tickets.get(date) ?? 0) + 1
    if (ticket) tickets.set(date, ticket)
    const bookedDaysBefore = extra.walkIn ? 0 : 1 + Math.floor(rand() * 4)
    const booking = {
      id: randomId(10, 'BT'),
      doctorId,
      clinicId: TEST_CLINIC_ID,
      userId: extra.userId ?? null,
      date,
      time,
      patientName: extra.patientName ?? pick(names),
      phone: extra.phone ?? phone(),
      status,
      ticket,
      service: pick(services[doctorId]),
      walkIn: extra.walkIn ?? false,
      position: extra.position ?? null,
      calledAt: extra.calledAt ?? null,
      createdAt: extra.walkIn ? at(date, time) : earlier(at(addDays(date, -bookedDaysBefore), `${10 + Math.floor(rand() * 10)}:${rand() < 0.5 ? '15' : '45'}`), new Date()),
    }
    rows.push(booking)
    return booking
  }
  const doctorIds = [DR_REZAN, DR_LANA]
  // The clinic gets busier as word gets around.
  for (let day = -14; day <= 7; day++) {
    const date = addDays(today, day)
    if (!isWorkingDay(date)) continue
    for (const doctorId of doctorIds) {
      const busy = day < 0 ? 4 + Math.round(((day + 14) / 14) * 5) : day === 0 ? 9 : Math.max(1, 7 - day)
      const slots = dailySlots.filter(() => rand() < busy / dailySlots.length).slice(0, busy)
      slots.forEach((time, i) => {
        if (day < 0) add(doctorId, date, time, rand() < 0.1 ? 'cancelled' : 'done')
        else if (day === 0) {
          const status: BookingStatus = i < 3 ? 'done' : i === 3 ? 'in_progress' : i < slots.length - 2 ? 'approved' : 'pending'
          add(doctorId, date, time, status, { calledAt: status === 'in_progress' ? Date.now() - 6 * 60_000 : undefined })
        } else add(doctorId, date, time, rand() < 0.75 ? 'approved' : 'pending')
      })
      if (day < 0 && rand() < 0.4) add(doctorId, date, '12:15', 'done', { walkIn: true, position: 12 * 60 + 15 })
    }
  }

  // The test patient: two past visits, and a place in today's line.
  const free = (doctorId: string, date: string) => dailySlots.find((t) => !rows.some((r) => r.doctorId === doctorId && r.date === date && r.time === t && r.status !== 'cancelled'))!
  const day = (n: number) => [n, n - 1, n - 2].map((d) => addDays(today, d)).find(isWorkingDay)!
  const me = { userId: id.patient, patientName: 'Hawre Salih', phone: patientPhone }
  const first = day(-12)
  add(DR_REZAN, first, free(DR_REZAN, first), 'done', me)
  const second = day(-5)
  const visit = add(DR_REZAN, second, free(DR_REZAN, second), 'done', me)
  const todayTime = dailySlots.slice(7).find((t) => !rows.some((r) => r.doctorId === DR_REZAN && r.date === today && r.time === t && r.status !== 'cancelled')) ?? free(DR_REZAN, today)
  const current = isWorkingDay(today) ? add(DR_REZAN, today, todayTime, 'approved', me) : null

  for (let i = 0; i < rows.length; i += 100) await db.insert(bookings).values(rows.slice(i, i + 100))

  await db.insert(notifications).values([
    { id: randomId(16), userId: id.patient, bookingId: visit.id, clinicId: TEST_CLINIC_ID, kind: 'done', ticket: visit.ticket, createdAt: at(second, '13:10'), readAt: at(second, '18:00') },
    ...(current ? [{ id: randomId(16), userId: id.patient, bookingId: current.id, clinicId: TEST_CLINIC_ID, kind: 'approved', ticket: current.ticket, createdAt: at(addDays(today, -1), '16:40') }] : []),
  ])

  // Prescriptions coming up for renewal; one belongs to the test patient's account.
  const renewals: { name: string; phone: string; in: number; told?: boolean; closed?: boolean; user?: string }[] = [
    { name: 'Hawre Salih', phone: patientPhone, in: 6, user: id.patient },
    { name: 'فاطمة حسين', phone: phone(), in: 0, told: true },
    { name: 'Aram Kamal', phone: phone(), in: 1 },
    { name: 'Kani Aziz', phone: phone(), in: 3, told: true },
    { name: 'علي حسن', phone: phone(), in: 5 },
    { name: 'Shene Rasul', phone: phone(), in: 7 },
    { name: 'Soran Qadir', phone: phone(), in: -2, told: true, closed: true },
    { name: 'Bahar Nawzad', phone: phone(), in: 21 },
  ]
  await db.insert(prescriptions).values(
    renewals.map((r, i) => ({
      id: randomId(16),
      clinicId: TEST_CLINIC_ID,
      doctorId: DR_REZAN,
      userId: r.user ?? null,
      patientName: r.name,
      phone: r.phone,
      renewOn: addDays(today, r.in),
      createdBy: i % 2 ? id.assistant : id.doctor,
      createdAt: at(addDays(today, -13 + i), '11:30'),
      notifiedAt: r.told ? at(addDays(today, Math.min(r.in, 0) - 1), '15:00') : null,
      closedAt: r.closed ? at(addDays(today, r.in), '10:00') : null,
    })),
  )
}
