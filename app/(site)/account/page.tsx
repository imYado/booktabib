import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { logout } from '@/app/actions'
import { changePassword, deleteOwnAccount, logoutEverywhere, updateProfile } from '@/app/profile-actions'
import { ClinicCard } from '@/components/ClinicCard'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Icon } from '@/components/Icon'
import { StatusPill } from '@/components/StatusPill'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { requireUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { getFavoriteIds } from '@/lib/favorites'
import { formatDay, todayISO } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { getClinicAccents } from '@/lib/settings'
import { listBookings, type Booking } from '@/lib/store'
import { isTheme, THEME_COOKIE } from '@/lib/theme'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.profile.title, robots: { index: false } }
}

type Props = { searchParams: Promise<{ saved?: string; error?: string }> }

export default async function ProfilePage({ searchParams }: Props) {
  const { clinics, doctors, getClinic, getDoctor } = await getCatalog()
  const { locale, t } = await getI18n()
  const user = await requireUser(['patient', 'assistant', 'doctor', 'admin'], '/account')
  const { saved, error } = await searchParams
  const today = todayISO()
  const [all, favoriteIds, accents] = await Promise.all([listBookings({ userId: user.id }), getFavoriteIds(), getClinicAccents()])
  const upcoming = all.filter((b) => b.date >= today && b.status !== 'done')
  const past = all.filter((b) => !upcoming.includes(b)).reverse()
  const favoriteClinics = favoriteIds.map((id) => clinics.find((c) => c.id === id)).filter((c) => !!c)
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value
  const theme = isTheme(themeCookie) ? themeCookie : 'system'
  const p = t.profile
  const stack = (gap: number) => ({ '--stack': `${gap}px` }) as React.CSSProperties
  const workplace = [getClinic(user.clinicId ?? '')?.name[locale], getDoctor(user.doctorId ?? '')?.name[locale]].filter(Boolean).join(' · ')

  const list = (items: Booking[]) => (
    <ul className="list">
      {items.map((b) => (
        <li key={b.id}>
          <Link href={`/bookings/${b.id}`} className="row between" style={{ textDecoration: 'none' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{getDoctor(b.doctorId)?.name[locale]}</div>
              <div className="meta">
                <span>{getClinic(b.clinicId)?.name[locale]}</span>
                <span>
                  {formatDay(locale, b.date)} · <span dir="ltr">{b.time}</span>
                </span>
              </div>
            </div>
            <StatusPill status={b.status} t={t} />
          </Link>
        </li>
      ))}
    </ul>
  )

  const notice = (section: string) => {
    const message =
      saved === section
        ? section === 'password'
          ? p.passwordChanged
          : p.saved
        : error && section === 'details' && error === 'missing'
          ? p.missing
          : section === 'security' && error && ['password', 'weak', 'locked', 'change'].includes(error)
            ? { weak: p.weak, locked: t.auth.locked, change: p.mustChange }[error] ?? p.wrongPassword
            : section === 'delete' && (error === 'password' || error === 'locked')
              ? error === 'locked'
                ? t.auth.locked
                : p.wrongPassword
              : null
    if (!message) return null
    return saved === section ? (
      <p className="saved-note" role="status">
        <Icon name="check" size={16} />
        {message}
      </p>
    ) : (
      <p className="notice" role="alert">
        {message}
      </p>
    )
  }

  return (
    <section className="section-tight">
      {/* A grid gap, not .stack: the sections set their own --stack, which would shrink the space above them. */}
      <div className="container" style={{ display: 'grid', gap: 56, maxWidth: 880, paddingTop: 32, paddingBottom: 72 }}>
        <div className="row between" style={{ alignItems: 'end' }}>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>
              {t.admin.roles[user.role]}
            </p>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', margin: 0 }}>{user.name}</h1>
            <p className="caption" style={{ margin: '4px 0 0' }} dir="ltr">
              {user.email}
            </p>
          </div>
          <form action={logout}>
            <button type="submit" className="btn btn-secondary">
              {p.logout}
            </button>
          </form>
        </div>

        <form action={updateProfile} id="details" className="card stack" style={stack(20)}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{p.details}</h2>
          {notice('details')}
          <div className="profile-grid">
            <div className="field">
              <label htmlFor="p-name">{p.name}</label>
              <input id="p-name" name="name" className="input" defaultValue={user.name} required maxLength={80} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="p-phone">{p.phone}</label>
              <input id="p-phone" name="phone" type="tel" className="input" defaultValue={user.phone} maxLength={30} dir="ltr" autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="p-gender">{p.gender}</label>
              <select id="p-gender" name="gender" className="select" defaultValue={user.gender}>
                <option value="">{p.genders.none}</option>
                <option value="female">{p.genders.female}</option>
                <option value="male">{p.genders.male}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="p-birth">{p.birthDate}</label>
              <input id="p-birth" name="birthDate" type="date" className="input" defaultValue={user.birthDate ?? ''} min="1900-01-01" max={today} dir="ltr" />
            </div>
          </div>
          <dl className="details" style={{ marginTop: 28 }}>
            <dt>{p.email}</dt>
            <dd dir="ltr">{user.email}</dd>
            <dt>{p.role}</dt>
            <dd>{t.admin.roles[user.role]}</dd>
            {workplace && (
              <>
                <dt>{p.workplace}</dt>
                <dd>{workplace}</dd>
              </>
            )}
            <dt>{p.memberSince}</dt>
            <dd>{formatDay(locale, user.createdAt.toISOString().slice(0, 10), { weekday: undefined, day: undefined, year: 'numeric', month: 'long' })}</dd>
          </dl>
          <p className="caption" style={{ margin: 0 }}>
            {p.emailHint}
          </p>
          <div>
            <button type="submit" className="btn">
              {p.save}
            </button>
          </div>
        </form>

        <div id="favorites">
          <h2 style={{ fontSize: '1.5rem' }}>{p.favorites}</h2>
          {favoriteClinics.length ? (
            <div className="grid" style={{ marginTop: 24 }}>
              {favoriteClinics.map((c) => (
                <ClinicCard
                  key={c.id}
                  clinic={c}
                  doctorCount={doctors.filter((d) => d.clinicId === c.id).length}
                  accent={accents[c.id]}
                  favorite={{ liked: true, signedIn: true }}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="card card-paper row between">
              <p style={{ margin: 0 }}>{p.noFavorites}</p>
              <Link href="/clinics" className="btn btn-sm">
                {t.account.find}
              </Link>
            </div>
          )}
        </div>

        <div id="bookings">
          <h2 style={{ fontSize: '1.5rem' }}>{p.bookings}</h2>
          {all.length === 0 ? (
            <p className="caption">{t.account.empty}</p>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 className="list-title">{t.account.upcoming}</h3>
                  {list(upcoming)}
                </div>
              )}
              {past.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <h3 className="list-title">{t.account.past}</h3>
                  {list(past)}
                </div>
              )}
            </>
          )}
        </div>

        <div id="appearance" className="stack" style={stack(12)}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{p.appearance}</h2>
          <ThemeSwitcher theme={theme} labels={p.themes} label={p.appearance} />
          <p className="caption" style={{ margin: 0 }}>
            {p.themeHint}
          </p>
        </div>

        <div id="security" className="card stack" style={stack(20)}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{p.security}</h2>
          {notice('security')}
          <form action={changePassword} className="profile-grid" style={{ alignItems: 'end' }}>
            <input type="text" name="username" autoComplete="username" defaultValue={user.email} hidden readOnly />
            <div className="field">
              <label htmlFor="p-current">{p.currentPassword}</label>
              <input id="p-current" name="current" type="password" className="input" required autoComplete="current-password" dir="ltr" />
            </div>
            <div className="field">
              <label htmlFor="p-new">{p.newPassword}</label>
              <input id="p-new" name="password" type="password" className="input" required minLength={8} maxLength={200} autoComplete="new-password" dir="ltr" />
            </div>
            <div>
              <button type="submit" className="btn btn-sm">
                {p.changePassword}
              </button>
            </div>
          </form>
          <div className="row">
            <form action={logoutEverywhere}>
              <button type="submit" className="btn btn-secondary btn-sm">
                {p.logoutAll}
              </button>
            </form>
          </div>
        </div>

        {user.role === 'patient' && (
          <form action={deleteOwnAccount} id="delete" className="card danger-zone stack" style={stack(16)}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{p.deleteTitle}</h2>
            <p className="caption" style={{ margin: 0 }}>
              {p.deleteLead}
            </p>
            {notice('delete')}
            <div className="field" style={{ maxWidth: 360 }}>
              <label htmlFor="p-delete">{p.deletePassword}</label>
              <input id="p-delete" name="password" type="password" className="input" required autoComplete="current-password" dir="ltr" />
            </div>
            <div>
              <ConfirmButton label={p.deleteButton} question={t.edit.sure} className="btn btn-danger" />
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
