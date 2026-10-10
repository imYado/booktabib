import { sql } from 'drizzle-orm'
import type { Localized } from '../lib/i18n'
import { bigint, boolean, date, doublePrecision, index, integer, jsonb, pgEnum, pgTable, primaryKey, real, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['patient', 'assistant', 'doctor', 'admin'])
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'approved', 'cancelled', 'in_progress', 'done'])

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  // Optional profile details: 'male', 'female' or '' (not given), and date of birth.
  gender: text('gender').notNull().default(''),
  birthDate: date('birth_date'),
  role: roleEnum('role').notNull().default('patient'),
  // Set when an administrator hands out a temporary password; cleared when the user picks their own.
  mustChangePassword: boolean('must_change_password').notNull().default(false),
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
    // Added at the desk rather than booked into a slot, so it doesn't hold the slot.
    walkIn: boolean('walk_in').notNull().default(false),
    // Place in the day's line after an assistant reorders it, in minutes since midnight like the
    // slot time. Empty means the booking's own time.
    position: doublePrecision('position'),
    // Secret for the patient's live queue link (/q/<token>). 256 random bits, so it cannot be guessed.
    liveToken: text('live_token')
      .notNull()
      .unique()
      .default(sql`replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')`),
  },
  (t) => [
    // One active booking per doctor per slot; cancelled ones and walk-ins don't hold a slot.
    uniqueIndex('bookings_slot_unique')
      .on(t.doctorId, t.date, t.time)
      .where(sql`${t.status} <> 'cancelled' and not ${t.walkIn}`),
    uniqueIndex('bookings_ticket_unique').on(t.clinicId, t.date, t.ticket),
    index('bookings_clinic_date_idx').on(t.clinicId, t.date),
    index('bookings_doctor_date_idx').on(t.doctorId, t.date),
    index('bookings_user_idx').on(t.userId),
  ],
)

// Clinics and their doctors, which administrators manage in edit mode.
export const clinics = pgTable('clinics', {
  id: text('id').primaryKey(),
  name: jsonb('name').$type<Localized>().notNull(),
  city: text('city').notNull(),
  address: jsonb('address').$type<Localized>().notNull(),
  phone: text('phone').notNull().default(''),
  lat: doublePrecision('lat').notNull().default(0),
  lng: doublePrecision('lng').notNull().default(0),
  rating: real('rating').notNull().default(0),
  reviews: integer('reviews').notNull().default(0),
  specialties: jsonb('specialties').$type<string[]>().notNull().default([]),
  about: jsonb('about').$type<Localized>().notNull(),
  imageId: text('image_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const doctors = pgTable(
  'doctors',
  {
    id: text('id').primaryKey(),
    clinicId: text('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Without the title; it is added in front from `honorific` (lib/data.ts).
    name: jsonb('name').$type<Localized>().notNull(),
    honorific: text('honorific').notNull().default('none'),
    honorificOther: jsonb('honorific_other').$type<Partial<Localized>>().notNull().default({}),
    specialty: text('specialty').notNull(),
    title: jsonb('title').$type<Localized>().notNull(),
    years: integer('years').notNull().default(0),
    fee: integer('fee').notNull().default(0),
    room: text('room').notNull().default(''),
    bio: jsonb('bio').$type<Localized>().notNull(),
    imageId: text('image_id'),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('doctors_clinic_idx').on(t.clinicId)],
)

// Uploaded clinic and doctor photos, kept in the database so no extra storage service is needed.
// Counts recent attempts (logins, sign-ups, bookings) so they can't be repeated endlessly.
export const rateLimits = pgTable('rate_limits', {
  // SHA-256 of what is counted, e.g. "login:email:<address>", so emails and IP addresses are not stored.
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
})

export const images = pgTable('images', {
  id: text('id').primaryKey(),
  contentType: text('content_type').notNull(),
  data: text('data').notNull(), // base64
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Clinics a user has hearted, shown on their profile.
export const favorites = pgTable(
  'favorites',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clinicId: text('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.clinicId] })],
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
