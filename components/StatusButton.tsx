import { updateBooking } from '@/app/actions'
import type { BookingStatus } from '@/lib/store'

export function StatusButton({
  id,
  status,
  label,
  primary = false,
  size = 'sm',
}: {
  id: string
  status: BookingStatus
  label: string
  primary?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <form action={updateBooking}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`btn${primary ? '' : ' btn-secondary'}${size === 'sm' ? ' btn-sm' : ''}`}>
        {label}
      </button>
    </form>
  )
}
