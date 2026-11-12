import type { Metadata } from 'next'
import { RenewalsPanel } from '@/components/RenewalsPanel'
import { addDays } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { listRenewals } from '@/lib/prescriptions'
import { listBookings } from '@/lib/store'
import { DeskShell, loadDesk, type DeskQuery } from '../desk'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.assistant.tabRenewals} · ${t.assistant.title}`, robots: { index: false } }
}

/** Prescription renewals. Patients are reminded by notifications on the site; the desk only keeps the list. */
export default async function AssistantRenewalsPage({ searchParams }: { searchParams: DeskQuery }) {
  const desk = await loadDesk(searchParams, 'renewals')
  const { clinic, doctorId, myDoctors, locale, t, today, suffix, query } = desk
  const [renewals, recent] = await Promise.all([
    listRenewals(clinic.id, doctorId),
    listBookings({ clinicId: clinic.id, doctorId, fromDate: addDays(today, -90), status: ['pending', 'approved', 'in_progress', 'done'] }),
  ])

  return (
    <DeskShell desk={desk}>
      <RenewalsPanel
        rows={renewals}
        doctors={myDoctors}
        recent={recent.filter((b) => b.date <= addDays(today, 30))}
        back={`/assistant/renewals${suffix}`}
        flag={query.renew}
        locale={locale}
        t={t}
      />
    </DeskShell>
  )
}
