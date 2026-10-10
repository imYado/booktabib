import Link from 'next/link'
import { logout } from '@/app/actions'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getCurrentUser } from '@/lib/auth'
import { getI18n } from '@/lib/locale'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n()
  const user = await getCurrentUser()
  const role = user?.role
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link href="/" className="brand" lang="en">
            {t.brand}
          </Link>
          <nav className="nav" aria-label="Main">
            <Link href="/clinics">{t.nav.clinics}</Link>
            {(role === 'assistant' || role === 'admin') && <Link href="/assistant">{t.nav.assistant}</Link>}
            {(role === 'doctor' || role === 'admin') && <Link href="/doctor">{t.nav.doctor}</Link>}
            {role === 'admin' && <Link href="/admin">{t.nav.admin}</Link>}
            {user && <Link href="/account">{t.nav.account}</Link>}
            {user ? (
              <form action={logout}>
                <button type="submit" className="btn btn-secondary btn-sm">
                  {t.nav.logout}
                </button>
              </form>
            ) : (
              <Link href="/login" className="btn btn-secondary btn-sm">
                {t.nav.login}
              </Link>
            )}
          </nav>
          <LanguageSwitcher locale={locale} label={t.common.switchTo} />
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="container row between">
          <span>
            <strong lang="en">{t.brand}</strong> · {t.tagline}
          </span>
          <span>{t.common.sampleNotice}</span>
        </div>
      </footer>
    </>
  )
}
