'use client'

import { useOptimistic, type CSSProperties } from 'react'
import { setTheme } from '@/app/profile-actions'
import { isTheme, themes, type Theme } from '@/lib/theme'

/** Automatic / Light / Dark, as a segmented control like the language switcher. Applies at once. */
export function ThemeSwitcher({ theme, labels, label }: { theme: Theme; labels: Record<Theme, string>; label: string }) {
  const [active, setActive] = useOptimistic(theme)

  async function choose(formData: FormData) {
    const next = formData.get('theme')
    if (!isTheme(next)) return
    setActive(next)
    if (next === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = next
    await setTheme(formData)
  }

  return (
    <form
      action={choose}
      className="lang-switch theme-switch"
      dir="ltr"
      aria-label={label}
      style={{ '--count': themes.length, '--index': themes.indexOf(active) } as CSSProperties}
    >
      <span className="lang-thumb" aria-hidden="true" />
      {themes.map((th) => (
        <button key={th} type="submit" name="theme" value={th} aria-pressed={th === active}>
          {labels[th]}
        </button>
      ))}
    </form>
  )
}
