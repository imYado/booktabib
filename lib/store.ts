import 'server-only'
import { dailySlots, doctors, getDoctor, isWorkingDay } from './data'
import { addDays, todayISO } from './format'

// In-memory booking store for previewing the site. Data resets whenever the
// server restarts; it will be replaced by a real database.

export type BookingStatus = 'pending' | 'approved' | 'cancelled' | 'in_progress' | 'done'

export type Booking = {
  id: string
  doctorId: string
  clinicId: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  patientName: string
  phone: string
  note: string
  status: BookingStatus
  ticket: number | null
  createdAt: number
  calledAt: number | null
}

type Store = { bookings: Booking[]; seq: number }

const globalStore = globalThis as unknown as { __booktabibStore?: Store }

function store(): Store {
  if (!globalStore.__booktabibStore) {
    globalStore.__booktabibStore = { bookings: [], seq: 1000 }
    seed(globalStore.__booktabibStore)
  }
  return globalStore.__booktabibStore
}

function newId(s: Store) {
  s.seq += 1
  return `BT${s.seq}`
}

function nextTicket(s: Store, clinicId: string, date: string) {
  const used = s.bookings.filter((b) => b.clinicId === clinicId && b.date === date && b.ticket !== null)
  return used.reduce((max, b) => Math.max(max, b.ticket ?? 0), 0) + 1
}

const samplePatients = [
  'Aram Kamal', 'Shilan Omar', 'أحمد جاسم', 'Zhwan Ali', 'فاطمة حسين', 'Rawa Sabir',
  'Hezha Majid', 'زينب كريم', 'Lana Fattah', 'Diyar Hama', 'مريم سعد', 'Soran Qadir',
]

function seed(s: Store) {
  const today = todayISO()
  let p = 0
  const take = () => samplePatients[p++ % samplePatients.length]
  const add = (doctorId: string, date: string, time: string, status: BookingStatus) => {
    const doctor = getDoctor(doctorId)!
    const ticket = status === 'pending' || status === 'cancelled' ? null : nextTicket(s, doctor.clinicId, date)
    s.bookings.push({
      id: newId(s),
      doctorId,
      clinicId: doctor.clinicId,
      date,
      time,
      patientName: take(),
      phone: '+964 750 000 0000',
      note: '',
      status,
      ticket,
      createdAt: Date.now() - 86_400_000,
      calledAt: status === 'in_progress' ? Date.now() - 300_000 : null,
    })
  }

  for (const d of doctors) {
    // Today: one patient done, one with the doctor, two waiting, one request to review.
    add(d.id, today, '09:00', 'done')
    add(d.id, today, '09:30', 'in_progress')
    add(d.id, today, '10:30', 'approved')
    add(d.id, today, '11:30', 'approved')
    add(d.id, today, '13:00', 'pending')
    // The rest of the week.
    for (let i = 1; i <= 6; i++) {
      const date = addDays(today, i)
      if (!isWorkingDay(date)) continue
      const count = (i + d.years) % 4
      for (let j = 0; j < count; j++) add(d.id, date, dailySlots[j * 2 + 1], j === 0 ? 'pending' : 'approved')
    }
  }
}

export function listBookings(filter: Partial<Pick<Booking, 'clinicId' | 'doctorId' | 'date' | 'status'>> = {}) {
  return store()
    .bookings.filter((b) =>
      (Object.keys(filter) as (keyof typeof filter)[]).every((k) => b[k] === filter[k]),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

export function getBooking(id: string) {
  return store().bookings.find((b) => b.id === id)
}

/** Slots on a given day that are still free for a doctor. */
export function openSlots(doctorId: string, date: string) {
  if (!isWorkingDay(date)) return []
  const taken = new Set(
    store()
      .bookings.filter((b) => b.doctorId === doctorId && b.date === date && b.status !== 'cancelled')
      .map((b) => b.time),
  )
  let slots = dailySlots.filter((t) => !taken.has(t))
  if (date === todayISO()) {
    const now = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
    slots = slots.filter((t) => t > now)
  }
  return slots
}

export function createBooking(input: { doctorId: string; date: string; time: string; patientName: string; phone: string; note: string }) {
  const doctor = getDoctor(input.doctorId)
  if (!doctor) throw new Error('Unknown doctor')
  if (!openSlots(doctor.id, input.date).includes(input.time)) throw new Error('Slot not available')
  const s = store()
  const booking: Booking = {
    id: newId(s),
    doctorId: doctor.id,
    clinicId: doctor.clinicId,
    date: input.date,
    time: input.time,
    patientName: input.patientName,
    phone: input.phone,
    note: input.note,
    status: 'pending',
    ticket: null,
    createdAt: Date.now(),
    calledAt: null,
  }
  s.bookings.push(booking)
  return booking
}

export function setStatus(id: string, status: BookingStatus) {
  const s = store()
  const booking = s.bookings.find((b) => b.id === id)
  if (!booking) throw new Error('Unknown booking')

  if (status === 'approved' && booking.ticket === null) {
    booking.ticket = nextTicket(s, booking.clinicId, booking.date)
  }
  if (status === 'in_progress') {
    // A doctor sees one patient at a time: whoever was with them is finished.
    for (const b of s.bookings) {
      if (b.doctorId === booking.doctorId && b.status === 'in_progress' && b.id !== id) b.status = 'done'
    }
    booking.calledAt = Date.now()
  }
  booking.status = status
  return booking
}
