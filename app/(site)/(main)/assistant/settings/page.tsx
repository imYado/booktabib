import type { Metadata } from 'next'
import { ClinicSettings } from '@/components/ClinicSettings'
import { canManageClinic } from '@/lib/auth'
import { getI18n } from '@/lib/locale'
import { getClinicAccent, getDoctorWhatsapps, getScreenLocale, getVisitMinutes } from '@/lib/settings'
import { DeskShell, loadDesk, type DeskQuery } from '../desk'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.assistant.tabSettings} · ${t.assistant.title}`, robots: { index: false } }
}

/** How the clinic's pages and TV screen look, doctors' WhatsApp numbers and visit lengths. */
export default async function AssistantSettingsPage({ searchParams }: { searchParams: DeskQuery }) {
  const desk = await loadDesk(searchParams, 'settings')
  const { clinic, myDoctors, user, locale, t } = desk
  const ids = myDoctors.map((d) => d.id)
  const [accent, screenLocale, whatsapps, visitMinutes] = await Promise.all([
    getClinicAccent(clinic.id),
    getScreenLocale(clinic.id),
    getDoctorWhatsapps(ids),
    getVisitMinutes(ids),
  ])

  return (
    <DeskShell desk={desk}>
      <ClinicSettings
        clinic={clinic}
        accent={accent}
        doctors={myDoctors}
        whatsapps={whatsapps}
        visitMinutes={visitMinutes}
        screenLocale={screenLocale}
        canEditAccent={canManageClinic(user, clinic.id)}
        locale={locale}
        t={t}
      />
    </DeskShell>
  )
}
