import Link from 'next/link'
import type { SessionUser } from '@/lib/auth'
import type { Dictionary } from '@/lib/i18n'
import { isPhoneVerified, verifyRequestLink } from '@/lib/phone-verification'
import { Icon } from './Icon'

/**
 * A strip under the header for signed-in users whose phone number isn't verified: one button opens
 * WhatsApp to the booktabib administrator with "verify my number" and the number typed in (in Arabic).
 * It only informs; booking works the same while unverified.
 */
export function PhoneVerifyBanner({ user, t }: { user: SessionUser; t: Dictionary }) {
  if (isPhoneVerified(user)) return null
  const link = verifyRequestLink(user)
  const v = t.phoneVerify
  return (
    <aside className="verify-banner" aria-label={v.title}>
      <div className="container">
        <Icon name="phone" size={18} />
        <p>
          <strong>{v.title}.</strong> <span>{link ? v.body : v.noPhone}</span>
        </p>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
            <Icon name="send" size={14} />
            {v.send}
          </a>
        ) : (
          <Link href="/account#details" className="btn btn-sm">
            {v.addPhone}
          </Link>
        )}
      </div>
    </aside>
  )
}
