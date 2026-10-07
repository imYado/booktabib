import { sql } from 'drizzle-orm'
import { bigint, date, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['patient', 'assistant', 'doctor', 'admin'])
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'approved', 'cancelled', 'in_progress', 'done'])

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('patient'),
  // Staff are tied to the clinic or doctor they work for (ids from lib/data.ts).
  clinicId: text('clinic_id'),
  doctorId: text('doctor_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable(
  'sessions',
  {
    // SHA-256 of the cookie token, so a database leak does not expose live sessions.
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

export const bookings = pgTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    doctorId: text('doctor_id').notNull(),
    clinicId: text('clinic_id').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    date: date('date').notNull(),
    time: text('time').notNull(),
    patientName: text('patient_name').notNull(),
    phone: text('phone').notNull(),
    note: text('note').notNull().default(''),
    status: bookingStatusEnum('status').notNull().default('pending'),
    ticket: integer('ticket'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    calledAt: bigint('called_at', { mode: 'number' }),
    // Secret for the patient's live queue link (/q/<token>). 256 random bits, so it cannot be guessed.
    liveToken: text('live_token')
      .notNull()
      .unique()
      .default(sql`replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')`),
  },
  (t) => [
    // One active booking per doctor per slot; cancelled ones free the slot.
    uniqueIndex('bookings_slot_unique')
      .on(t.doctorId, t.date, t.time)
      .where(sql`${t.status} <> 'cancelled'`),
    uniqueIndex('bookings_ticket_unique').on(t.clinicId, t.date, t.ticket),
    index('bookings_clinic_date_idx').on(t.clinicId, t.date),
    index('bookings_doctor_date_idx').on(t.doctorId, t.date),
    index('bookings_user_idx').on(t.userId),
  ],
)

// Settings clinic staff can change themselves. Clinics and doctors are ids from lib/data.ts.
export const clinicSettings = pgTable('clinic_settings', {
  clinicId: text('clinic_id').primaryKey(),
  accent: text('accent').notNull().default('paper'),
})

export const doctorSettings = pgTable('doctor_settings', {
  doctorId: text('doctor_id').primaryKey(),
  // Where the patient's live link sends WhatsApp messages. Empty means the clinic number.
  whatsapp: text('whatsapp').notNull().default(''),
})

export type User = typeof users.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type BookingStatus = Booking['status']
