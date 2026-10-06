import { Icon } from './Icon'

/** Paper circle with a muted icon, standing in for a doctor's photo. */
export function Avatar({ size = 56 }: { size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, color: 'var(--caption)' }} aria-hidden="true">
      <Icon name="user" size={Math.round(size * 0.42)} />
    </span>
  )
}
