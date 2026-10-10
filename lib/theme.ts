export const THEME_COOKIE = 'bt_theme'
export const themes = ['system', 'light', 'dark'] as const
export type Theme = (typeof themes)[number]

export function isTheme(v: unknown): v is Theme {
  return typeof v === 'string' && (themes as readonly string[]).includes(v)
}
