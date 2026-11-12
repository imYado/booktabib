export type IconName = 'search' | 'pin' | 'arrow' | 'clock' | 'star' | 'calendar' | 'phone' | 'image' | 'check' | 'x' | 'user' | 'grip' | 'plus' | 'edit' | 'trash' | 'undo' | 'heart' | 'instagram' | 'bell' | 'copy' | 'send' | 'call' | 'gear' | 'inbox' | 'repeat' | 'queue' | 'tv'

const paths: Record<IconName, React.ReactNode> = {
  grip: (
    <>
      <circle cx="9" cy="6" r="0.6" />
      <circle cx="15" cy="6" r="0.6" />
      <circle cx="9" cy="12" r="0.6" />
      <circle cx="15" cy="12" r="0.6" />
      <circle cx="9" cy="18" r="0.6" />
      <circle cx="15" cy="18" r="0.6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  send: <path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z" />,
  call: <path d="M3 10v4h3l6 4V6L6 10H3ZM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  inbox: <path d="M4 13h4.5l1.5 3h4l1.5-3H20M4 13l2.5-8h11L20 13v6H4v-6Z" />,
  repeat: <path d="M4.5 12a7.5 7.5 0 0 1 13.4-4.6M19.5 12a7.5 7.5 0 0 1-13.4 4.6M18.5 3.5v4h-4M5.5 20.5v-4h4" />,
  queue: (
    <>
      <circle cx="6" cy="7" r="2" />
      <path d="M11 7h9M11 12h9M11 17h9" />
      <circle cx="6" cy="12" r="0.6" />
      <circle cx="6" cy="17" r="0.6" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  bell: <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5ZM10 20.5a2.2 2.2 0 0 0 4 0" />,
  heart: <path d="M12 20.6c-.35 0-.7-.12-.98-.35C7.9 17.7 3 13.9 3 9.2 3 6.3 5.2 4 8 4c1.6 0 3 .8 4 2.1C13 4.8 14.4 4 16 4c2.8 0 5 2.3 5 5.2 0 4.7-4.9 8.5-8.02 11.05-.28.23-.63.35-.98.35Z" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" />,
  trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4m8-4v4" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  check: <path d="m5 12 5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
}

/** Icons whose meaning depends on direction, and so mirror in RTL. */
const directional: IconName[] = ['arrow', 'call', 'undo']

export function Icon({ name, size = 18, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={directional.includes(name) ? 'icon-dir' : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {paths[name]}
    </svg>
  )
}
