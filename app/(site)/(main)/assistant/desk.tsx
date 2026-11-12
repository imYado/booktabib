import 'server-only'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Icon, type IconName } from '@/components/Icon'
import { PickerForm } from '@/components/PickerForm'
import { SendLink } from '@/components/SendLink'
import { requireUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { whatsappNumber } from '@/lib/data'
import { localDigits, todayISO } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { listRenewals } from '@/lib/prescriptions'
import { listBookings, type Booking } from '@/lib/store'

export type DeskQuery = Promise<{ clinic?: string; renew?: string }>
type Section = 'today' | 'requests' | 'renewals' | 'settings'

const paths: Record<Section, string> = {
  today: '/assistant',
  requests: '/assistant/requests',
  renewals: '/assistant/renewals',
  settings: '/assistant/settings',
}

/** Who is at the desk, for which clinic and doctors: shared by every page of the desk. */
export async function loadDesk(searchParams: DeskQuery, section: Section) {
  const catalog = await getCatalog()
  const { locale, t } = await getI18n()
  const user = await requireUser(['assistant', 'admin'], paths[section])
  // Assistants work for one clinic; administrators can look at any.
  const query = await searchParams
  const clinic =
    (user.role === 'assistant' ? catalog.getClinic(user.clinicId ?? '') : catalog.getClinic(query.clinic ?? '')) ?? catalog.clinics[0]
  // An assistant tied to one doctor only sees that doctor's patients.
  const doctorId = user.role === 'assistant' ? (user.doctorId ?? undefined) : undefined
  const myDoctors = catalog.doctorsAt(clinic.id).filter((d) => !doctorId || d.id === doctorId)
  // Administrators keep the clinic they picked as they move between the desk's pages.
  const suffix = user.role === 'admin' ? `?clinic=${clinic.id}` : ''
  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`
  return { ...catalog, locale, t, user, query, clinic, doctorId, myDoctors, suffix, origin, today: todayISO(), section }
}

export type Desk = Awaited<ReturnType<typeof loadDesk>>

/** WhatsApp and copy buttons for a patient's live queue link. */
export function LinkButtons({ desk, b }: { desk: Desk; b: Booking }) {
  const { t, origin } = desk
  const url = `${origin}/q/${b.liveToken}`
  const phone = whatsappNumber(b.phone)
  const message = t.assistant.linkMessage.replace('{name}', b.patientName).replace('{url}', url)
  return (
    <SendLink
      url={url}
      whatsappHref={phone.length >= 8 ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null}
      sendLabel={t.assistant.sendLink}
      copyLabel={t.assistant.copyLink}
      copiedLabel={t.assistant.copied}
    />
  )
}

/** The desk's title, clinic and the tabs that move between its pages, around one page's content. */
export async function DeskShell({ desk, children }: { desk: Desk; children: ReactNode }) {
  const { t, locale, user, clinic, clinics, doctorId, getDoctor, suffix, section, today } = desk
  const [waiting, pending, renewals] = await Promise.all([
    listBookings({ clinicId: clinic.id, doctorId, date: today, status: ['approved', 'in_progress'] }),
    listBookings({ clinicId: clinic.id, doctorId, status: 'pending', fromDate: today }),
    listRenewals(clinic.id, doctorId),
  ])
  const dueSoon = renewals.filter((p) => p.daysLeft <= 7 && !p.booked).length
  const tabs: { key: Section; icon: IconName; label: string; count?: number; alert?: boolean }[] = [
    { key: 'today', icon: 'queue', label: t.assistant.tabToday, count: waiting.length },
    { key: 'requests', icon: 'inbox', label: t.assistant.tabRequests, count: pending.length, alert: pending.length > 0 },
    { key: 'renewals', icon: 'repeat', label: t.assistant.tabRenewals, count: dueSoon, alert: dueSoon > 0 },
    { key: 'settings', icon: 'gear', label: t.assistant.tabSettings },
  ]

  return (
    <section className="section-tight">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <div className="row between" style={{ alignItems: 'end', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>{t.assistant.title}</h1>
            <p className="lead" style={{ margin: 0 }}>
              {t.assistant.lead}
            </p>
          </div>
          <Link href={`/screen?clinic=${clinic.id}`} className="btn btn-secondary" target="_blank">
            <Icon name="tv" size={18} />
            {t.assistant.openScreen}
          </Link>
        </div>

        {user.role === 'admin' ? (
          <PickerForm
            name="clinic"
            label={t.assistant.clinic}
            value={clinic.id}
            options={clinics.map((c) => ({ value: c.id, label: c.name[locale] }))}
            submit={t.common.show}
          />
        ) : (
          <p className="eyebrow">
            {clinic.name[locale]}
            {doctorId && ` · ${getDoctor(doctorId)?.name[locale]}`}
          </p>
        )}

        <nav className="desk-nav" aria-label={t.assistant.sections}>
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`${paths[tab.key]}${suffix}`}
              className="desk-tab"
              aria-current={tab.key === section ? 'page' : undefined}
            >
              <Icon name={tab.icon} size={20} />
              <span className="desk-tab-label">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={tab.alert ? 'switch-count is-alert' : 'switch-count'}>{localDigits(locale, tab.count)}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="desk-page">{children}</div>
      </div>
    </section>
  )
}
