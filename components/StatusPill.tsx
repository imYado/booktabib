import type { Dictionary } from '@/lib/i18n'
import type { BookingStatus } from '@/lib/store'
import { Icon } from './Icon'

const icons: Partial<Record<BookingStatus, 'clock' | 'check' | 'x' | 'user'>> = {
  pending: 'clock',
  approved: 'check',
  in_progress: 'user',
  done: 'check',
  cancelled: 'x',
}

/** A booking's status. `datePending`: a request the clinic accepted but hasn't given a day yet. */
export function StatusPill({ status, t, datePending = false }: { status: BookingStatus; t: Dictionary; datePending?: boolean }) {
  const icon = icons[status]
  return (
    <span className={`pill pill-${status}`}>
      {icon && <Icon name={icon} size={14} />}
      {datePending && status === 'pending' ? t.status.datePending : t.status[status]}
    </span>
  )
}
