import type { CSSProperties } from 'react'

/**
 * Accent colours a clinic can pick for its pages. All share the lightness and softness of the
 * default warm paper, so ink text and the rest of the design read the same on every one. Each
 * comes with a matching line colour for dividers and light borders, and a dark-mode pair: the
 * same tint, low and quiet on the dark background.
 */
export const accents = {
  paper: { paper: '#F2EDE3', rule: '#E4DED2', darkPaper: '#25221C', darkRule: '#36332C' },
  red: { paper: '#F2E3E3', rule: '#E3D2D2', darkPaper: '#2A1D19', darkRule: '#3A2D29' },
  pink: { paper: '#F2E3ED', rule: '#E3D2DD', darkPaper: '#2A1D21', darkRule: '#3A2D31' },
  purple: { paper: '#EEE3F2', rule: '#DED2E3', darkPaper: '#271D25', darkRule: '#372D35' },
  blue: { paper: '#E3E8F2', rule: '#D2D8E3', darkPaper: '#1E2125', darkRule: '#2E3135' },
  sky: { paper: '#E3F1F2', rule: '#D2E1E3', darkPaper: '#1E2825', darkRule: '#2E3835' },
  green: { paper: '#E3F2E3', rule: '#D2E3D2', darkPaper: '#1E2919', darkRule: '#2E3929' },
  yellow: { paper: '#F2F2E3', rule: '#E3E3D2', darkPaper: '#2A2919', darkRule: '#3A3929' },
} as const

export type AccentId = keyof typeof accents

export const accentIds = Object.keys(accents) as AccentId[]

export function isAccent(value: unknown): value is AccentId {
  return typeof value === 'string' && value in accents
}

/** Inline style that re-tints everything inside it that uses the paper accent or its lines. */
export function accentStyle(id: AccentId | undefined): CSSProperties {
  const { paper, rule, darkPaper, darkRule } = accents[id ?? 'paper']
  return { '--paper': `light-dark(${paper}, ${darkPaper})`, '--rule': `light-dark(${rule}, ${darkRule})` } as CSSProperties
}
