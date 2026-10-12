import type { Locale } from '@/lib/i18n'

export type Bar = { key: string; label: string; value: number; text: string; highlight?: boolean }

/** Bar chart drawn in ink and caption tones only: one bar per day or week, its value written above it. */
export function BarChart({ data, locale, label }: { data: Bar[]; locale: Locale; label: string }) {
  const w = 560
  const h = 200
  const top = 24
  const bottom = 32
  const max = Math.max(1, ...data.map((d) => d.value))
  const slot = w / data.length
  const barW = Math.min(44, slot * 0.55)
  const rtl = locale !== 'en'

  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <line x1={0} x2={w} y1={h - bottom} y2={h - bottom} stroke="var(--rule)" />
      {data.map((d, i) => {
        const index = rtl ? data.length - 1 - i : i
        const cx = slot * index + slot / 2
        const barH = ((h - top - bottom) * d.value) / max
        return (
          <g key={d.key}>
            <rect
              x={cx - barW / 2}
              y={h - bottom - barH}
              width={barW}
              height={barH}
              rx={4}
              fill={d.highlight ? 'var(--ink)' : 'var(--paper)'}
              stroke="var(--ink)"
              strokeWidth={d.highlight ? 0 : 1}
            />
            <text x={cx} y={h - bottom - barH - 8} textAnchor="middle" style={{ fill: 'var(--ink)', fontWeight: 500 }}>
              {d.text}
            </text>
            <text x={cx} y={h - 10} textAnchor="middle" style={d.highlight ? { fill: 'var(--ink)', fontWeight: 500 } : undefined}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
