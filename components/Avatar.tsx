import { Icon } from './Icon'

// Photos are small uploads served from /img with long caching, so next/image adds nothing here.
/* eslint-disable @next/next/no-img-element */

/** A doctor's photo in a circle, or a paper circle with a muted icon when there is none. */
export function Avatar({ size = 56, imageId }: { size?: number; imageId?: string | null }) {
  return (
    <span className="avatar" style={{ width: size, height: size, color: 'var(--caption)' }} aria-hidden="true">
      {imageId ? <img src={`/img/${imageId}`} alt="" width={size} height={size} /> : <Icon name="user" size={Math.round(size * 0.42)} />}
    </span>
  )
}

/** A clinic's photo, or an empty paper frame when there is none. */
export function ClinicPhoto({ imageId, style }: { imageId?: string | null; style?: React.CSSProperties }) {
  return (
    <div className="placeholder" style={style}>
      {imageId ? <img src={`/img/${imageId}`} alt="" /> : <Icon name="image" size={28} />}
    </div>
  )
}
