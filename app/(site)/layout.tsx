import { Icon } from '@/components/Icon'
import { getI18n } from '@/lib/locale'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n()
  return (
    <>
      {children}
      <footer className="site-footer">
        <div className="container row between">
          <span>
            <strong lang="en">{t.brand}</strong> · {t.tagline}
          </span>
          <a href="https://www.instagram.com/booktabib/" target="_blank" rel="noopener noreferrer" className="footer-social" dir="ltr">
            <Icon name="instagram" size={18} />
            @booktabib
          </a>
          <span>{t.common.sampleNotice}</span>
        </div>
      </footer>
    </>
  )
}
