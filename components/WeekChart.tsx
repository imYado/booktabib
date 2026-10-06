import { formatDay, formatNumber } from '@/lib/format'
import type { Locale } from '@/lib/i18n'

/** Bar chart of appointments per day, drawn in ink and caption tones only. */
export function WeekChart({
  data,
  today,
  locale,
  label,
}: {
  data: { date: string; count: number }[]
  today: string
  locale: Locale
  label: string
}) {
  const w = 560
  const h = 200
  const top = 24
  const bottom = 32
  const max = Math.max(1, ...data.map((d) => d.count))
  const slot = w / data.length
  const barW = Math.min(44, slot * 0.55)
  const rtl = locale !== 'en'

  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <line x1={0} x2={w} y1={h - bottom} y2={h - bottom} stroke="var(--rule)" />
      {data.map((d, i) => {
        const index = rtl ? data.length - 1 - i : i
        const cx = slot * index + slot / 2
        const barH = ((h - top - bottom) * d.count) / max
        const isToday = d.date === today
        return (
          <g key={d.date}>
            <rect
              x={cx - barW / 2}
              y={h - bottom - barH}
              width={barW}
              height={barH}
              rx={4}
              fill={isToday ? 'var(--ink)' : 'var(--paper)'}
              stroke="var(--ink)"
              strokeWidth={isToday ? 0 : 1}
            />
            <text x={cx} y={h - bottom - barH - 8} textAnchor="middle" style={{ fill: 'var(--ink)', fontWeight: 500 }}>
              {formatNumber(locale, d.count)}
            </text>
            <text x={cx} y={h - 10} textAnchor="middle" style={isToday ? { fill: 'var(--ink)', fontWeight: 500 } : undefined}>
              {formatDay(locale, d.date, { day: undefined, month: undefined })}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
