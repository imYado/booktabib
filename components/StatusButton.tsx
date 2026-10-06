import { updateBooking } from '@/app/actions'
import type { BookingStatus } from '@/lib/store'

export function StatusButton({
  id,
  status,
  label,
  primary = false,
}: {
  id: string
  status: BookingStatus
  label: string
  primary?: boolean
}) {
  return (
    <form action={updateBooking}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`btn btn-sm${primary ? '' : ' btn-secondary'}`}>
        {label}
      </button>
    </form>
  )
}
