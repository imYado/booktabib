import Link from 'next/link'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getI18n } from '@/lib/locale'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n()
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link href="/" className="brand" lang="en">
            {t.brand}
          </Link>
          <nav className="nav" aria-label="Main">
            <Link href="/clinics">{t.nav.clinics}</Link>
            <Link href="/assistant">{t.nav.assistant}</Link>
            <Link href="/doctor">{t.nav.doctor}</Link>
            <LanguageSwitcher locale={locale} t={t} />
          </nav>
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
