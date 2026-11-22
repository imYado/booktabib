import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users, type User } from '@/db/schema'
import { whatsappNumber } from './data'
import { whatsappLink, whatsappText } from './whatsapp'

/**
 * Phone verification. Until there is an OTP check, a user sends the site a WhatsApp message with their
 * number and an administrator marks it verified on the admin "Phone numbers" page. Being unverified
 * blocks nothing: people can still book.
 *
 * When OTP arrives, call `markPhoneVerified(userId, phone, 'otp')` once the code matches.
 */

/** Where "verify my number" messages go. Defaults to the booktabib number on the ads and flyers. */
export function verificationWhatsapp() {
  return process.env.VERIFY_WHATSAPP?.trim() || '07730304703'
}

/** The number in wa.me digits, reading Arabic-Indic digits too, so the same number always compares equal. */
export function phoneDigits(phone: string) {
  return whatsappNumber(phone.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)))
}

type PhoneFields = Pick<User, 'role' | 'phone' | 'phoneVerified'>

/** Whether the user's current phone number is verified. Administrators don't need verifying. */
export function isPhoneVerified(user: PhoneFields) {
  if (user.role === 'admin') return true
  const number = phoneDigits(user.phone)
  return number.length >= 8 && user.phoneVerified === number
}

/** The wa.me link a user presses to ask the administrator to verify their number, or null without a number. */
export function verifyRequestLink(user: Pick<User, 'name' | 'phone' | 'email'>) {
  if (phoneDigits(user.phone).length < 8) return null
  return whatsappLink(verificationWhatsapp(), whatsappText.verifyPhone(user.name, user.phone, user.email))
}

/** Marks `phone` as the user's verified number. Pass the number that was checked, so a later change unverifies it. */
export async function markPhoneVerified(userId: string, phone: string, by: 'admin' | 'otp') {
  const db = await getDb()
  await db
    .update(users)
    .set({ phoneVerified: phoneDigits(phone), phoneVerifiedAt: new Date(), phoneVerifiedBy: by })
    .where(eq(users.id, userId))
}

export async function clearPhoneVerified(userId: string) {
  const db = await getDb()
  await db.update(users).set({ phoneVerified: '', phoneVerifiedAt: null, phoneVerifiedBy: '' }).where(eq(users.id, userId))
}
