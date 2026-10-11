import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getCurrentUser } from '@/lib/auth'
import { localDigits } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { unreadCount } from '@/lib/notifications'

/**
 * The bar at the top of the site. On clinic and doctor pages it is pared down to the wordmark and one
 * button, so a shared clinic link reads like the clinic's own page: signed out, both lead to log in;
 * signed in, the wordmark goes home and the button opens the profile.
 */
export async function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const { locale, t } = await getI18n()
  const user = await getCurrentUser()
  const role = user?.role
  const unread = user ? await unreadCount(user.id) : 0
  return (
    <header className={minimal ? 'site-header site-header-minimal' : 'site-header'}>
      <div className="container">
        <Link href={minimal && !user ? '/login' : '/'} className="brand" lang="en">
          {t.brand}
        </Link>
        <nav className="nav" aria-label="Main">
          {!minimal && (
            <>
              <Link href="/clinics">{t.nav.clinics}</Link>
              {(role === 'assistant' || role === 'admin') && <Link href="/assistant">{t.nav.assistant}</Link>}
              {(role === 'doctor' || role === 'admin') && <Link href="/doctor">{t.nav.doctor}</Link>}
              {role === 'admin' && <Link href="/admin">{t.nav.admin}</Link>}
            </>
          )}
          {user && <NotificationBell unread={unread} label={t.notifications.title} unreadLabel={t.notifications.unread(unread)} locale={locale} />}
          {/* Signed in, the button slot opens the profile, where Log out lives. */}
          <Link href={user ? '/account' : '/login'} className="btn btn-secondary btn-sm">
            {user ? t.nav.account : t.nav.login}
          </Link>
        </nav>
        <LanguageSwitcher locale={locale} label={t.common.switchTo} />
      </div>
    </header>
  )
}

export function NotificationBell({ unread, label, unreadLabel, locale }: { unread: number; label: string; unreadLabel: string; locale: Parameters<typeof localDigits>[0] }) {
  return (
    <Link href="/notifications" className="bell" aria-label={unread ? `${label}, ${unreadLabel}` : label} title={label}>
      <Icon name="bell" size={20} />
      {unread > 0 && (
        <span className="bell-count" aria-hidden="true">
          {localDigits(locale, unread > 9 ? '9+' : unread)}
        </span>
      )}
    </Link>
  )
}
