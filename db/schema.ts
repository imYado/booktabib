import { sql } from 'drizzle-orm'
import type { Localized } from '../lib/i18n'
import { bigint, boolean, check, date, doublePrecision, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

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
    // The service the patient picked, copied from the doctor's list at booking time so later price changes don't alter it.
    service: jsonb('service').$type<BookedService>(),
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
    // The lowest of the service prices below, kept for sorting and older code.
    fee: integer('fee').notNull().default(0),
    // What the doctor offers and what each costs, in whole thousands of IQD.
    services: jsonb('services').$type<DoctorService[]>().notNull().default([]),
    room: text('room').notNull().default(''),
    bio: jsonb('bio').$type<Localized>().notNull(),
    imageId: text('image_id'),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('doctors_clinic_idx').on(t.clinicId), check('doctors_fee_thousands', sql`${t.fee} >= 0 and ${t.fee} % 1000 = 0`)],
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

// A user's 1 to 5 star rating of a clinic they have booked at. One per user and clinic; rating again replaces it.
export const clinicRatings = pgTable(
  'clinic_ratings',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clinicId: text('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    stars: integer('stars').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.clinicId] }), index('clinic_ratings_clinic_idx').on(t.clinicId), check('clinic_ratings_stars', sql`${t.stars} between 1 and 5`)],
)

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
  // Language of the clinic's TV screen ('en', 'ar' or 'ckb'), whatever language the TV's browser is set to.
  screenLocale: text('screen_locale').notNull().default('ar'),
})

export const doctorSettings = pgTable('doctor_settings', {
  doctorId: text('doctor_id').primaryKey(),
  // Where the patient's live link sends WhatsApp messages. Empty means the clinic number.
  whatsapp: text('whatsapp').notNull().default(''),
  // How long a visit usually takes, used to estimate when each waiting patient will be seen.
  visitMinutes: integer('visit_minutes').notNull().default(15),
})

// Messages to a patient's account when the clinic acts on their booking. The text is written in the
// reader's language when shown, from the kind and the booking.
export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookingId: text('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
    clinicId: text('clinic_id').notNull(),
    // 'approved', 'arrive', 'turn', 'cancelled', 'done', 'moved', or 'renew7', 'renew3', 'renewDay' for prescriptions
    kind: text('kind').notNull(),
    ticket: integer('ticket'),
    // For 'arrive': the estimated time (HH:MM) the patient should be there. For 'moved': the new time.
    time: text('time'),
    prescriptionId: text('prescription_id').references(() => prescriptions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)],
)

// A patient whose prescription runs out on `renewOn`, added by the doctor or an assistant. The patient's
// account is reminded 7 days before, then 3 days before and on the day unless they have booked again.
export const prescriptions = pgTable(
  'prescriptions',
  {
    id: text('id').primaryKey(),
    clinicId: text('clinic_id').notNull(),
    doctorId: text('doctor_id').notNull(),
    // The patient's account, when the prescription was added from a booking made while signed in.
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    patientName: text('patient_name').notNull(),
    phone: text('phone').notNull().default(''),
    renewOn: date('renew_on').notNull(),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // Ticked by staff once they told the patient themselves, for example on WhatsApp.
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    // The latest in-app reminder sent: '', '7', '3' or 'day'.
    appStage: text('app_stage').notNull().default(''),
    // When an in-app reminder last actually went out (the 3-day and same-day ones are skipped once they've booked).
    appSentAt: timestamp('app_sent_at', { withTimezone: true }),
    // Renewed or no longer needed: off the list.
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (t) => [index('prescriptions_clinic_idx').on(t.clinicId, t.renewOn), index('prescriptions_user_idx').on(t.userId)],
)

export type Prescription = typeof prescriptions.$inferSelect

export type DoctorService = { name: Localized; fee: number }
export type BookedService = DoctorService

export type User = typeof users.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type BookingStatus = Booking['status']
