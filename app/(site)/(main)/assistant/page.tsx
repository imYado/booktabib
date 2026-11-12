import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { StatusButton } from '@/components/StatusButton'
import { SortableQueue } from '@/components/SortableQueue'
import { QueueSwitch } from '@/components/QueueSwitch'
import { AddPatientForm, EditToggle, PatientRow } from '@/components/DeskParts'
import { localDigits } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { getVisitMinutes } from '@/lib/settings'
import { estimateLine, listBookings, nowMinutes } from '@/lib/store'
import { DeskShell, LinkButtons, loadDesk, type DeskQuery } from './desk'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.assistant.title, robots: { index: false } }
}

/** The desk's first page: who is with the doctor, today's line and who has finished. */
export default async function AssistantTodayPage({ searchParams }: { searchParams: DeskQuery }) {
  const desk = await loadDesk(searchParams, 'today')
  const { clinic, doctorId, myDoctors, getDoctor, locale, t, today, suffix } = desk
  const [queue, pendingCount, visitMinutes] = await Promise.all([
    listBookings({ clinicId: clinic.id, doctorId, date: today, status: ['approved', 'in_progress', 'done', 'cancelled'] }),
    listBookings({ clinicId: clinic.id, doctorId, status: 'pending', fromDate: today }).then((r) => r.length),
    getVisitMinutes(myDoctors.map((d) => d.id)),
  ])
  const serving = queue.filter((b) => b.status === 'in_progress')
  const waiting = queue.filter((b) => b.status === 'approved')
  // Finished today, seen or removed, most recent first; any of them can be added back to the line.
  const finished = queue.filter((b) => b.status === 'done' || b.status === 'cancelled').reverse()
  // When each waiting patient will likely be seen, from their doctor's line order and visit length.
  const now = nowMinutes()
  const estimates = new Map<string, string>()
  for (const d of myDoctors) {
    const line = queue.filter((b) => b.doctorId === d.id && (b.status === 'approved' || b.status === 'in_progress'))
    for (const [id, time] of estimateLine(line, visitMinutes[d.id], now)) estimates.set(id, time)
  }

  return (
    <DeskShell desk={desk}>
      {pendingCount > 0 && (
        <Link href={`/assistant/requests${suffix}`} className="desk-alert">
          <Icon name="inbox" size={20} />
          <span>{t.assistant.requestsWaiting(pendingCount)}</span>
          <span className="desk-alert-go">
            {t.assistant.review}
            <Icon name="arrow" size={16} />
          </span>
        </Link>
      )}

      <section className="card panel">
        <div className="panel-head">
          <h2>{t.assistant.today}</h2>
          <AddPatientForm doctors={myDoctors} locale={locale} t={t} />
        </div>
        <QueueSwitch
          label={t.assistant.today}
          tabs={[
            {
              key: 'waiting',
              label: t.assistant.waitingTab,
              count: localDigits(locale, serving.length + waiting.length),
              content: (
                <>
                  {serving.length > 0 && (
                    <p className="list-title" style={{ margin: '16px 0 0' }}>
                      {t.assistant.nowServing}
                    </p>
                  )}
                  {serving.length > 0 && (
                    <ul className="list with-doctor">
                      {serving.map((b) => (
                        <li key={b.id} className="queue-item">
                          <PatientRow b={b} doctorName={getDoctor(b.doctorId)?.name[locale]} locale={locale} t={t}>
                            <StatusButton id={b.id} status="done" label={t.assistant.done} tone="go" icon="check" />
                            <StatusButton id={b.id} status="approved" label={t.assistant.backToWaiting} icon="undo" />
                            <LinkButtons desk={desk} b={b} />
                          </PatientRow>
                        </li>
                      ))}
                    </ul>
                  )}
                  {waiting.length ? (
                    <>
                      <p className="caption" style={{ margin: '12px 0 0' }}>
                        {t.assistant.dragHint}
                      </p>
                      <SortableQueue
                        handleLabel={t.assistant.moveHandle}
                        items={waiting.map((b) => ({
                          id: b.id,
                          content: (
                            <PatientRow b={b} doctorName={getDoctor(b.doctorId)?.name[locale]} estimate={estimates.get(b.id)} locale={locale} t={t}>
                              <StatusButton id={b.id} status="in_progress" label={t.assistant.call} tone="go" icon="call" />
                              <LinkButtons desk={desk} b={b} />
                              <EditToggle id={b.id} label={t.assistant.edit} />
                              <StatusButton id={b.id} status="cancelled" label={t.assistant.remove} tone="danger" icon="trash" iconOnly />
                            </PatientRow>
                          ),
                        }))}
                      />
                    </>
                  ) : (
                    <p className="caption empty">{t.assistant.noToday}</p>
                  )}
                </>
              ),
            },
            {
              key: 'finished',
              label: t.assistant.finishedTab,
              count: localDigits(locale, finished.length),
              content: finished.length ? (
                <ul className="list">
                  {finished.map((b) => (
                    <li key={b.id} className={`queue-item${b.status === 'cancelled' ? ' is-removed' : ''}`}>
                      <PatientRow b={b} doctorName={getDoctor(b.doctorId)?.name[locale]} locale={locale} t={t}>
                        <StatusButton id={b.id} status="approved" label={t.assistant.addBack} icon="undo" />
                      </PatientRow>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="caption empty">{t.assistant.noFinished}</p>
              ),
            },
          ]}
        />
      </section>
    </DeskShell>
  )
}
