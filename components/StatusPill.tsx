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

export function StatusPill({ status, t }: { status: BookingStatus; t: Dictionary }) {
  const icon = icons[status]
  return (
    <span className={`pill pill-${status}`}>
      {icon && <Icon name={icon} size={14} />}
      {t.status[status]}
    </span>
  )
}
