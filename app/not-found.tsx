import Link from 'next/link'
import { getI18n } from '@/lib/locale'

export default async function NotFound() {
  const { t } = await getI18n()
  return (
    <main className="section">
      <div className="container">
        <h1>{t.common.notFound}</h1>
        <p className="lead">{t.common.notFoundBody}</p>
        <Link href="/" className="btn">
          {t.booking.backHome}
        </Link>
      </div>
    </main>
  )
}
