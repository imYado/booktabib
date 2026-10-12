'use client'

import { useState, type ReactNode } from 'react'

type Tab = { key: string; label: string; count: string; content: ReactNode }

/**
 * Two (or more) lists in one place, with a switch on top to choose which one shows: today's waiting
 * line and the patients who are finished. The choice stays put while the page refreshes itself.
 */
export function QueueSwitch({ tabs, label }: { tabs: Tab[]; label: string }) {
  const [active, setActive] = useState(tabs[0].key)
  const current = tabs.find((t) => t.key === active) ?? tabs[0]
  return (
    <div>
      <div className="switch" role="tablist" aria-label={label}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={t.key === current.key}
            aria-controls={`panel-${t.key}`}
            className="switch-option"
            onClick={() => setActive(t.key)}
          >
            {t.label}
            <span className="switch-count">{t.count}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${current.key}`} aria-labelledby={`tab-${current.key}`} className="switch-panel">
        {current.content}
      </div>
    </div>
  )
}
