import type { CSSProperties } from 'react'

/**
 * Accent colours a clinic can pick for its pages. All share the lightness and softness of the
 * default warm paper, so ink text and the rest of the design read the same on every one. Each
 * comes with a matching line colour for dividers and light borders.
 */
export const accents = {
  paper: { paper: '#F2EDE3', rule: '#E4DED2' },
  red: { paper: '#F2E3E3', rule: '#E3D2D2' },
  pink: { paper: '#F2E3ED', rule: '#E3D2DD' },
  purple: { paper: '#EEE3F2', rule: '#DED2E3' },
  blue: { paper: '#E3E8F2', rule: '#D2D8E3' },
  sky: { paper: '#E3F1F2', rule: '#D2E1E3' },
  green: { paper: '#E3F2E3', rule: '#D2E3D2' },
  yellow: { paper: '#F2F2E3', rule: '#E3E3D2' },
} as const

export type AccentId = keyof typeof accents

export const accentIds = Object.keys(accents) as AccentId[]

export function isAccent(value: unknown): value is AccentId {
  return typeof value === 'string' && value in accents
}

/** Inline style that re-tints everything inside it that uses the paper accent or its lines. */
export function accentStyle(id: AccentId | undefined): CSSProperties {
  const { paper, rule } = accents[id ?? 'paper']
  return { '--paper': paper, '--rule': rule } as CSSProperties
}
