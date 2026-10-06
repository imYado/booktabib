import type { Locale } from './i18n'

export const CLINIC_TIME_ZONE = 'Asia/Baghdad'

const intlLocale: Record<Locale, string> = {
  en: 'en-GB',
  ar: 'ar-IQ-u-nu-latn',
  ckb: 'ckb-IQ-u-nu-latn',
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
