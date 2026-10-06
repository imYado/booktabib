'use client'

import { useState } from 'react'

/** Lets the assistant send a patient their live queue link on WhatsApp, or copy it. */
export function SendLink({ url, whatsappHref, sendLabel, copyLabel, copiedLabel }: {
  url: string
  whatsappHref: string | null
  sendLabel: string
  copyLabel: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <>
      {whatsappHref && (
        <a className="btn btn-sm btn-secondary" href={whatsappHref} target="_blank" rel="noopener noreferrer">
          {sendLabel}
        </a>
      )}
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          } catch {
            window.prompt(copyLabel, url)
          }
        }}
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </>
  )
}
