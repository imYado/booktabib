import { formatTime } from './format'
import type { Dictionary, Locale } from './i18n'

/**
 * A booking's time as patients and staff read it: the booked time, or for a booking with no specific
 * time, "About 10:20" from its current estimate.
 */
export function bookingTime(locale: Locale, t: Dictionary, b: { time: string; flexible: boolean }) {
  return b.flexible ? t.booking.about(formatTime(locale, b.time)) : formatTime(locale, b.time)
}
