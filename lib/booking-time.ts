import { formatTime } from './format'
import type { Dictionary, Locale } from './i18n'

/** Patients are shown an estimated time this many minutes before the real estimate, so they arrive in time. */
export const PATIENT_HEAD_START = 20

/** The estimated time a patient sees: the real estimate minus the head start (HH:MM). */
export function patientTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  const t = Math.max(0, h * 60 + m - PATIENT_HEAD_START)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/**
 * A booking's time as patients and staff read it: the booked time, or for a booking with no specific
 * time, "About 10:20" from its current estimate. Patients (`forPatient`) see that estimate
 * PATIENT_HEAD_START minutes early; staff see the real one.
 */
export function bookingTime(locale: Locale, t: Dictionary, b: { time: string; flexible: boolean }, forPatient = false) {
  if (!b.flexible) return formatTime(locale, b.time)
  return t.booking.about(formatTime(locale, forPatient ? patientTime(b.time) : b.time))
}
