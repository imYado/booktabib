import type { Metadata } from 'next'
import Link from 'next/link'
import { AutoRefresh } from '@/components/AutoRefresh'
import { Icon } from '@/components/Icon'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { InstallGuideMount } from '@/components/InstallGuideMount'
import { getCatalog } from '@/lib/catalog'
import { whatsappNumber } from '@/lib/data'
import { formatDay, formatTime, localDigits, todayISO } from '@/lib/format'
import { accentStyle } from '@/lib/accents'
import { getCurrentUser } from '@/lib/auth'
import { getI18n } from '@/lib/locale'
import { contactNumberFor, getClinicAccent } from '@/lib/settings'
import { estimatedTime, getBookingByLiveToken, queuePosition } from '@/lib/store'

// The patient's live queue page. Anyone holding the link can open it, so it shows only
// the patient's name, their number, the line and how to reach the clinic: no phone
// number, doctor, specialty or notes.

export const metadata: Metadata = {
  title: 'booktabib',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function LiveQueuePage({ params }: { params: Promise<{ token: string }> }) {
  const { getClinic, getDoctor } = await getCatalog()
  const { locale, t } = await getI18n()
  const token = (await params).token
  const [booking, user] = await Promise.all([getBookingByLiveToken(token), getCurrentUser()])
  // Signed out, the wordmark leads to log in, and the booking is added to the account afterwards.
  const brandHref = user ? '/account' : booking ? `/login?claim=${booking.liveToken}` : '/login'

  const header = (
    <header className="live-top">
      <Link href={brandHref} className="brand" lang="en">
        booktabib
      </Link>
      <LanguageSwitcher locale={locale} label={t.common.switchTo} />
    </header>
  )

  if (!booking) {
    return (
      <main className="live">
        {header}
        <p className="lead" style={{ marginTop: 48 }}>
          {t.live.notFound}
        </p>
      </main>
    )
  }

  const clinic = getClinic(booking.clinicId)
  const room = getDoctor(booking.doctorId)?.room
  const today = todayISO()
  const isToday = booking.date === today
  const active = booking.status === 'pending' || booking.status === 'approved' || booking.status === 'in_progress'
  const position = booking.status === 'approved' && isToday ? await queuePosition(booking) : null
  const estimate = position ? estimatedTime(booking, position.ahead) : null
  const { lat, lng } = clinic?.location ?? { lat: 0, lng: 0 }
  // WhatsApp goes to the doctor's own number when the clinic set one, otherwise to the clinic.
  const contact = await contactNumberFor(booking.doctorId)
  const wa = contact ? `https://wa.me/${whatsappNumber(contact)}?text=${encodeURIComponent(t.live.whatsappText(booking.ticket))}` : null
  const accent = await getClinicAccent(booking.clinicId)

  return (
    <main className="live" style={accentStyle(accent)}>
      {active && <AutoRefresh seconds={10} />}
      {header}

      <p className="eyebrow" style={{ marginTop: 40 }}>
        {t.live.title}
      </p>
      <h1 className="live-name">{booking.patientName}</h1>

      <section className="live-card" aria-live="polite">
        {booking.status === 'in_progress' && (
          <>
            <p className="live-big">{t.live.yourTurn}</p>
            {room && <p className="live-sub">{t.live.goToRoom(room)}</p>}
          </>
        )}

        {booking.status === 'pending' && <p className="live-sub">{t.live.pending}</p>}
        {booking.status === 'cancelled' && <p className="live-sub">{t.live.cancelled}</p>}
        {booking.status === 'done' && <p className="live-sub">{t.live.done}</p>}

        {booking.status === 'approved' && !isToday && (
          <>
            <p className="caption">{t.live.appointment}</p>
            <p className="live-sub">
              {formatDay(locale, booking.date, { weekday: 'long', month: 'long' })} · <span>{formatTime(locale, booking.time)}</span>
            </p>
          </>
        )}

        {booking.ticket !== null && booking.status !== 'done' && booking.status !== 'cancelled' && (
          <div className="live-stats">
            <div>
              <div className="caption">{t.live.ticket}</div>
              <div className="live-number">{localDigits(locale, booking.ticket ?? '')}</div>
            </div>
            {position && (
              <div>
                <div className="caption">{t.live.nowServing}</div>
                <div className="live-number">{position.servingTicket ? localDigits(locale, position.servingTicket) : '–'}</div>
              </div>
            )}
          </div>
        )}

        {position && estimate && (
          <div className="live-line">
            <p className="live-sub" style={{ margin: 0 }}>
              {t.live.ahead(position.ahead)}
            </p>
            <p style={{ margin: 0 }}>
              {t.live.estimate}: <strong>{formatTime(locale, estimate)}</strong>
            </p>
            <p className="caption" style={{ margin: 0 }}>
              {t.live.estimateNote}
            </p>
          </div>
        )}
      </section>

      {clinic && (
        <section className="stack" style={{ '--stack': '12px', marginTop: 32 } as React.CSSProperties}>
          <p style={{ fontWeight: 500, margin: 0 }}>{t.live.directions}</p>
          <div className="choices">
            <a className="btn btn-secondary btn-sm" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
              <Icon name="pin" size={16} /> Google Maps
            </a>
            <a className="btn btn-secondary btn-sm" href={`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`} target="_blank" rel="noopener noreferrer">
              <Icon name="pin" size={16} /> Waze
            </a>
            <a className="btn btn-secondary btn-sm" href={`https://maps.apple.com/?daddr=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
              <Icon name="pin" size={16} /> Apple Maps
            </a>
          </div>
          {wa && (
            <a className="btn btn-block" href={wa} target="_blank" rel="noopener noreferrer" style={{ marginTop: 20 }}>
              <Icon name="phone" /> {t.live.whatsapp}
            </a>
          )}
        </section>
      )}

      {active && (
        <p className="caption" style={{ marginTop: 32, textAlign: 'center' }}>
          {t.live.autoUpdate}
        </p>
      )}
      <InstallGuideMount t={t} />
    </main>
  )
}
