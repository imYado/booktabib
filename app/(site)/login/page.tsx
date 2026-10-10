import type { Metadata } from 'next'
import Link from 'next/link'
import { login } from '@/app/actions'
import { getI18n } from '@/lib/locale'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.auth.loginTitle }
}

type Props = { searchParams: Promise<{ next?: string; error?: string; denied?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { t } = await getI18n()
  const { next = '', error, denied } = await searchParams
  const message = error === 'invalid' ? t.auth.invalid : error === 'locked' ? t.auth.locked : denied ? t.auth.denied : null

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>{t.auth.loginTitle}</h1>
        <p className="lead">{t.auth.loginLead}</p>
        <form action={login} className="stack" style={{ '--stack': '20px', marginTop: 32 } as React.CSSProperties}>
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="email">{t.auth.email}</label>
            <input id="email" name="email" type="email" className="input" required autoComplete="email" dir="ltr" />
          </div>
          <div className="field">
            <label htmlFor="password">{t.auth.password}</label>
            <input id="password" name="password" type="password" className="input" required autoComplete="current-password" dir="ltr" />
          </div>
          {message && (
            <p className="notice" role="alert">
              {message}
            </p>
          )}
          <button type="submit" className="btn btn-block">
            {t.auth.loginSubmit}
          </button>
        </form>
        <hr className="rule" style={{ margin: '40px 0 24px' }} />
        <p>
          {t.auth.noAccount}{' '}
          <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}>{t.auth.toRegister}</Link>
        </p>
        <p className="caption">{t.auth.staffNote}</p>
      </div>
    </section>
  )
}
