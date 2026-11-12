import { updateBooking } from '@/app/actions'
import type { BookingStatus } from '@/lib/store'
import { Icon, type IconName } from './Icon'

/**
 * How a desk button looks, by what it does: `go` (green) moves a patient forward, `neutral` steps
 * back or changes nothing for good, `danger` (red) takes someone off a list. `primary` is the plain
 * dark button used outside the desk.
 */
export type Tone = 'go' | 'neutral' | 'danger' | 'primary'

export const toneClass: Record<Tone, string> = {
  go: 'btn btn-go',
  neutral: 'btn btn-secondary',
  danger: 'btn btn-danger',
  primary: 'btn',
}

export function StatusButton({
  id,
  status,
  label,
  tone = 'neutral',
  icon,
  iconOnly = false,
  size = 'sm',
}: {
  id: string
  status: BookingStatus
  label: string
  tone?: Tone
  icon?: IconName
  /** Show only the icon; the label becomes its tooltip and what screen readers say. */
  iconOnly?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <form action={updateBooking}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`${toneClass[tone]}${size === 'sm' ? ' btn-sm' : ''}${iconOnly ? ' btn-icon' : ''}`}
        title={iconOnly ? label : undefined}
        aria-label={iconOnly ? label : undefined}
      >
        {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
        {!iconOnly && label}
      </button>
    </form>
  )
}
