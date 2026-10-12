import type { Locale } from './i18n'

export const CLINIC_TIME_ZONE = 'Asia/Baghdad'

// Arabic and Kurdish use Arabic-Indic digits (٠١٢…), since many readers don't use Latin numbers.
const intlLocale: Record<Locale, string> = {
  en: 'en-GB',
  ar: 'ar-IQ-u-nu-arab',
  ckb: 'ckb-IQ-u-nu-arab',
}

/** Today's date in the clinics' time zone, as YYYY-MM-DD. */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TIME_ZONE }).format(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDay(locale: Locale, iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  try {
    return new Intl.DateTimeFormat(intlLocale[locale], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
      ...opts,
    }).format(new Date(`${iso}T12:00:00Z`))
  } catch {
    return iso
  }
}

export function formatNumber(locale: Locale, n: number): string {
  return new Intl.NumberFormat(intlLocale[locale]).format(n)
}

/** A clinic time like "14:30" in 12-hour form: "2:30 PM", "٢:٣٠ م", "٢:٣٠ د.ن". */
export function formatTime(locale: Locale, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : intlLocale[locale], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, h, m)))
}

/** Ticket numbers, room numbers and the like, in the reader's digits. */
export function localDigits(locale: Locale, value: number | string): string {
  return locale === 'en' ? String(value) : String(value).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

/** Whole days from one ISO date to another: daysUntil('2026-01-01', '2026-01-08') is 7. */
export function daysUntil(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}
