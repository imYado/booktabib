import { clinics, dailySlots, doctors, isWorkingDay } from '../lib/data'
import { addDays, todayISO } from '../lib/format'
import { randomId } from '../lib/ids'
import { hashPassword } from '../lib/password'
import type { DB } from './index'
import { bookings, users, type BookingStatus } from './schema'

export const DEMO_PASSWORD = 'booktabib-demo'

const samplePatients = [
  'Aram Kamal', 'Shilan Omar', 'أحمد جاسم', 'Zhwan Ali', 'فاطمة حسين', 'Rawa Sabir', 'Hezha Majid',
  'زينب كريم', 'Lana Fattah', 'Diyar Hama', 'مريم سعد', 'Soran Qadir', 'Kani Aziz', 'علي حسن',
  'Bestun Rauf', 'نور الهدى', 'Chiman Salar', 'Halo Mahmud', 'سارة ياسين', 'Nyan Karim', 'Awat Hussein',
  'هبة عادل', 'Shene Rasul', 'Dara Jamal', 'رنا فاضل',
]

/**
 * Fills an empty database with demo accounts and bookings (local development
 * and previews). Does nothing once any user exists.
 */
export async function seedDemo(db: DB) {
  const existing = await db.select({ id: users.id }).from(users).limit(1)
  if (existing.length) return

  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const demoUsers = [
    { email: 'admin@example.com', name: 'Demo Admin', role: 'admin' as const },
    { email: 'assistant@example.com', name: 'Demo Assistant', role: 'assistant' as const, clinicId: clinics[0].id },
    { email: 'doctor@example.com', name: 'Dr. Sara Ahmed', role: 'doctor' as const, clinicId: clinics[0].id, doctorId: doctors[0].id },
    { email: 'patient@example.com', name: 'Demo Patient', role: 'patient' as const, phone: '+964 750 000 0000' },
  ]
  const ids: Record<string, string> = {}
  for (const u of demoUsers) {
    ids[u.role] = randomId(16)
    await db.insert(users).values({ id: ids[u.role], passwordHash, ...u })
  }

  const today = todayISO()
  const rows: (typeof bookings.$inferInsert)[] = []
  const tickets = new Map<string, number>()
  let p = 0
  const add = (doctorIndex: number, date: string, time: string, status: BookingStatus, userId: string | null = null) => {
    const d = doctors[doctorIndex]
    const key = `${d.clinicId}|${date}`
    const ticket = status === 'pending' || status === 'cancelled' ? null : (tickets.get(key) ?? 0) + 1
    if (ticket) tickets.set(key, ticket)
    rows.push({
      id: randomId(10, 'BT'),
      doctorId: d.id,
      clinicId: d.clinicId,
      userId,
      date,
      time,
      patientName: userId ? 'Demo Patient' : samplePatients[p++ % samplePatients.length],
      phone: '+964 750 000 0000',
      status,
      ticket,
      calledAt: status === 'in_progress' ? Date.now() - 300_000 : null,
    })
  }

  doctors.forEach((d, i) => {
    add(i, today, '09:00', 'done')
    add(i, today, '09:30', 'in_progress')
    add(i, today, '10:30', 'approved')
    add(i, today, '11:30', 'approved')
    add(i, today, '13:00', 'pending')
    for (let day = 1; day <= 6; day++) {
      const date = addDays(today, day)
      if (!isWorkingDay(date)) continue
      const count = (day + d.years) % 4
      for (let j = 0; j < count; j++) add(i, date, dailySlots[j * 2 + 1], j === 0 ? 'pending' : 'approved')
    }
  })
  // The demo patient has an upcoming request of their own.
  const nextDay = [1, 2, 3].map((n) => addDays(today, n)).find(isWorkingDay)!
  add(2, nextDay, dailySlots[10], 'pending', ids.patient)

  await db.insert(bookings).values(rows)
}
