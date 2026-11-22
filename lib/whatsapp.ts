import { whatsappNumber } from './data'
import { formatDay } from './format'
import { digits } from './i18n'

/**
 * Every message the site writes for WhatsApp, ready for the sender to press Send. They are always in
 * Arabic, whatever language the person sending it has the site in, so patients and clinics get the
 * same wording.
 */
export const whatsappText = {
  /** From the desk to a patient: their live place in line. */
  liveLink: (name: string, url: string) => `مرحباً ${name}، تابع دورك في الطابور من هنا: ${url}`,
  /** From a patient's live page to the clinic or doctor. */
  toClinic: (ticket: number | null) => (ticket ? `مرحباً، رقمي ${digits(ticket)} في طابور اليوم.` : 'مرحباً، لدي سؤال عن موعدي.'),
  /** From the desk or the doctor to a patient whose prescription needs renewing. */
  renewal: (name: string, clinic: string, renewOn: string, url: string) =>
    `مرحباً ${name}، معك ${clinic}. وصفتك الطبية تحتاج إلى تجديد يوم ${formatDay('ar', renewOn, { weekday: 'long', month: 'long' })}. يرجى حجز زيارة قبل ذلك من هنا: ${url}`,
}

/** A wa.me link that opens a chat with `phone` and the message typed in, or null if the number is too short. */
export function whatsappLink(phone: string, text: string) {
  const number = whatsappNumber(phone)
  return number.length >= 8 ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null
}
