import type { Metadata } from 'next'
import { desc, ne } from 'drizzle-orm'
import { unverifyPhone, verifyPhone } from '@/app/admin-actions'
import { AdminTabs } from '@/components/AdminParts'
import { Icon } from '@/components/Icon'
import { SearchField } from '@/components/SearchField'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { formatDay } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { isPhoneVerified, phoneDigits } from '@/lib/phone-verification'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.phoneVerify.adminTitle, robots: { index: false } }
}

type Props = { searchParams: Promise<{ q?: string; saved?: string }> }

/** Accounts waiting for their phone number to be verified by hand, until there is an OTP check. */
export default async function AdminPhonesPage({ searchParams }: Props) {
  const { locale, t } = await getI18n()
  await requireUser(['admin'], '/admin/phones')
  const { q = '', saved } = await searchParams
  const v = t.phoneVerify
  const db = await getDb()
  const accounts = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      phoneVerified: users.phoneVerified,
      phoneVerifiedAt: users.phoneVerifiedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(ne(users.role, 'admin'))
    .orderBy(desc(users.createdAt))

  // Matches the name or email as typed, and the phone however it is written (0750…, +964 750…, Arabic digits).
  const needle = q.trim().toLowerCase()
  // Typed digits without the leading 0 or 964, so "0750 12" finds "+964 750 123 4567".
  const needleDigits = phoneDigits(needle).replace(/^964/, '')
  const matches = (a: (typeof accounts)[number]) =>
    !needle || a.name.toLowerCase().includes(needle) || a.email.toLowerCase().includes(needle) || (needleDigits.length >= 3 && phoneDigits(a.phone).includes(needleDigits))
  const shown = accounts.filter(matches)
  // People who have a number come first: they are the ones who can message to be verified.
  const waiting = shown.filter((a) => !isPhoneVerified(a)).sort((a, b) => Number(!a.phone) - Number(!b.phone))
  const recent = shown
    .filter((a) => isPhoneVerified(a))
    .sort((a, b) => (b.phoneVerifiedAt?.getTime() ?? 0) - (a.phoneVerifiedAt?.getTime() ?? 0))
    .slice(0, 20)
  const day = (d: Date) => formatDay(locale, d.toISOString().slice(0, 10), { weekday: undefined, year: 'numeric' })

  const row = (a: (typeof accounts)[number], verified: boolean) => (
    <li key={a.id} className="row between phone-row">
      <div>
        <div className="phone-number" dir="ltr">
          {a.phone || <span className="caption">{v.missingPhone}</span>}
        </div>
        <div className="meta">
          <span style={{ fontWeight: 500 }}>{a.name}</span>
          <span dir="ltr">{a.email}</span>
          {verified && a.phoneVerifiedAt ? <span>{v.verifiedOn.replace('{date}', day(a.phoneVerifiedAt))}</span> : <span>{day(a.createdAt)}</span>}
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {a.role !== 'patient' && <span className="pill">{t.admin.roles[a.role]}</span>}
        {a.phone && (
          <form action={verified ? unverifyPhone : verifyPhone}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="q" value={q} />
            <button type="submit" className={verified ? 'btn btn-secondary btn-sm' : 'btn btn-sm'}>
              <Icon name={verified ? 'undo' : 'check'} size={14} />
              {verified ? v.markUnverified : v.markVerified}
            </button>
          </form>
        )}
      </div>
    </li>
  )

  return (
    <section className="section-tight">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 72, maxWidth: 960 }}>
        <AdminTabs active="phones" t={t} />
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>{v.adminTitle}</h1>
        <p className="lead">{v.adminLead}</p>
        {saved && (
          <p className="saved-note" role="status">
            <Icon name="check" size={16} />
            {saved === 'verified' ? v.doneNote : v.undoneNote}
          </p>
        )}
        <form action="/admin/phones" style={{ marginTop: 24, maxWidth: 520 }}>
          <SearchField placeholder={v.search} defaultValue={q} submitLabel={v.search} />
        </form>

        <h2 style={{ fontSize: '1.5rem', marginTop: 40 }}>
          {v.waiting} <span className="caption">({waiting.length})</span>
        </h2>
        {waiting.length ? (
          <ul className="list">{waiting.map((a) => row(a, false))}</ul>
        ) : (
          <p className="card card-paper" style={{ margin: 0 }}>
            {needle ? v.noMatch : v.none}
          </p>
        )}

        {recent.length > 0 && (
          <>
            <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>{v.recent}</h2>
            <ul className="list">{recent.map((a) => row(a, true))}</ul>
          </>
        )}
      </div>
    </section>
  )
}
