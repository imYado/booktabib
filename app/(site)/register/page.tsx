import type { Metadata } from 'next'
import Link from 'next/link'
import { register } from '@/app/actions'
import { getI18n } from '@/lib/locale'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.auth.registerTitle }
}

type Props = { searchParams: Promise<{ next?: string; error?: string; setup?: string }> }

export default async function RegisterPage({ searchParams }: Props) {
  const { t } = await getI18n()
  const { next = '', error, setup } = await searchParams
  const messages: Record<string, string> = { exists: t.auth.exists, weak: t.auth.weak, missing: t.auth.missing, reserved: t.auth.reserved }
  const message = error ? messages[error] : null

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>{t.auth.registerTitle}</h1>
        <p className="lead">{t.auth.registerLead}</p>
        <form action={register} className="stack" style={{ '--stack': '20px', marginTop: 32 } as React.CSSProperties}>
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="name">{t.auth.name}</label>
            <input id="name" name="name" className="input" required maxLength={80} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="phone">{t.auth.phone}</label>
            <input id="phone" name="phone" type="tel" className="input" required maxLength={30} autoComplete="tel" dir="ltr" placeholder="+964" />
          </div>
          <div className="field">
            <label htmlFor="email">{t.auth.email}</label>
            <input id="email" name="email" type="email" className="input" required autoComplete="email" dir="ltr" />
          </div>
          <div className="field">
            <label htmlFor="password">{t.auth.password}</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              required
              minLength={8}
              autoComplete="new-password"
              dir="ltr"
            />
          </div>
          {/* Only shown at /register?setup=1, for the person setting up the administrator account. */}
          {setup === '1' && (
            <div className="field">
              <label htmlFor="setupCode">{t.auth.setupCode}</label>
              <input id="setupCode" name="setupCode" type="password" className="input" required autoComplete="off" dir="ltr" />
            </div>
          )}
          {message && (
            <p className="notice" role="alert">
              {message}
            </p>
          )}
          <button type="submit" className="btn btn-block">
            {t.auth.registerSubmit}
          </button>
        </form>
        <hr className="rule" style={{ margin: '40px 0 24px' }} />
        <p>
          {t.auth.haveAccount} <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>{t.auth.toLogin}</Link>
        </p>
      </div>
    </section>
  )
}
