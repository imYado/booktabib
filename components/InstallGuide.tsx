'use client'

/* eslint-disable @next/next/no-img-element -- the app icon is a small static file */

import { useEffect, useState } from 'react'

export type InstallLabels = {
  title: string
  lead: string
  steps: [string, string, string]
  ios: { title: string; hint: string }[]
  android: { title: string; hint: string }[]
  doneTitle: string
  menuAdd: string
  menuCopy: string
  menuBookmark: string
  add: string
  install: string
  installNow: string
  next: string
  back: string
  gotIt: string
  later: string
}

type Platform = 'ios' | 'android'
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const DISMISSED = 'bt-install-dismissed'
const OPEN_EVENT = 'bt:install-guide'
// After "Not now" the guide stays away for two weeks.
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000

function detect(): Platform | null {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return null
}

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function readDismissed() {
  try {
    return Number(localStorage.getItem(DISMISSED) ?? 0)
  } catch {
    return 0
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISSED, String(Date.now()))
  } catch {}
}

/** Opens the guide from anywhere, such as the footer link. */
export function InstallLink({ label }: { label: string }) {
  return (
    <button type="button" className="link-button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {label}
    </button>
  )
}

/**
 * A step-by-step picture guide for adding booktabib to a phone's home screen. Opens by itself once on
 * phones (not when already opened from the home screen), and again from the footer link.
 */
export function InstallGuide({ labels }: { labels: InstallLabels }) {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<Platform>('ios')
  const [step, setStep] = useState(0)
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)

  useEffect(() => {
    const found = detect()
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPrompt)
    }
    const onOpen = () => {
      if (found) setPlatform(found)
      setStep(0)
      setOpen(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener(OPEN_EVENT, onOpen)
    let timer: ReturnType<typeof setTimeout> | undefined
    if (found && !standalone() && Date.now() - readDismissed() > SNOOZE_MS) timer = setTimeout(onOpen, 1500)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener(OPEN_EVENT, onOpen)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function close() {
    writeDismissed()
    setOpen(false)
  }

  if (!open) return null
  const texts = platform === 'ios' ? labels.ios : labels.android
  const last = step === 3

  return (
    <div className="ig-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="ig-sheet" role="dialog" aria-modal="true" aria-labelledby="ig-title">
        <div className="ig-head">
          <img src="/icon-192.png" alt="" width={44} height={44} className="ig-app" />
          <div>
            <h2 id="ig-title">{labels.title}</h2>
            <p>{labels.lead}</p>
          </div>
        </div>

        <div className="ig-tabs" role="tablist">
          {(['ios', 'android'] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={platform === p}
              onClick={() => {
                setPlatform(p)
                setStep(0)
              }}
            >
              {p === 'ios' ? 'iPhone' : 'Android'}
            </button>
          ))}
        </div>

        {platform === 'android' && prompt && step === 0 && (
          <button
            type="button"
            className="btn btn-block"
            style={{ marginBottom: 12 }}
            onClick={async () => {
              await prompt.prompt()
              const { outcome } = await prompt.userChoice
              setPrompt(null)
              if (outcome === 'accepted') close()
            }}
          >
            {labels.installNow}
          </button>
        )}

        <div className="ig-stage" dir="ltr" aria-hidden="true">
          {platform === 'ios' ? <IosPicture step={step} labels={labels} /> : <AndroidPicture step={step} labels={labels} />}
        </div>

        <div className="ig-text" aria-live="polite">
          {last ? (
            <p className="ig-step-title">{labels.doneTitle}</p>
          ) : (
            <>
              <p className="ig-step-num">{labels.steps[step]}</p>
              <p className="ig-step-title">{texts[step].title}</p>
              <p className="ig-step-hint">{texts[step].hint}</p>
            </>
          )}
        </div>

        <div className="ig-dots" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i === step ? 'on' : undefined} />
          ))}
        </div>

        <div className="ig-nav">
          {step > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              {labels.back}
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={close}>
              {labels.later}
            </button>
          )}
          <button type="button" className="btn" onClick={() => (last ? close() : setStep(step + 1))}>
            {last ? labels.gotIt : labels.next}
          </button>
        </div>
      </div>
    </div>
  )
}

/* Pictures of the phone screen at each step. The part to tap is marked with a pulsing ring. */

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4M6 11H5v9h14v-9h-1" />
    </svg>
  )
}

function PlusSquare() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

function Page() {
  return (
    <div className="ig-page">
      <div className="ig-line w60 bold" />
      <div className="ig-block" />
      <div className="ig-line w90" />
      <div className="ig-line w70" />
      <div className="ig-line w80" />
    </div>
  )
}

function Home({ labels }: { labels: InstallLabels }) {
  return (
    <div className="ig-home">
      {Array.from({ length: 16 }, (_, i) =>
        i === 5 ? (
          <span key={i} className="ig-tile ig-mine">
            <img src="/icon-192.png" alt="" className="ig-hot" />
            <small>booktabib</small>
          </span>
        ) : (
          <span key={i} className="ig-tile" />
        ),
      )}
      <span className="visually-hidden">{labels.doneTitle}</span>
    </div>
  )
}

function IosPicture({ step, labels }: { step: number; labels: InstallLabels }) {
  if (step === 3)
    return (
      <div className="ig-phone">
        <Home labels={labels} />
      </div>
    )
  return (
    <div className="ig-phone">
      {step === 2 ? (
        <div className="ig-dialog-ios">
          <div className="ig-dialog-bar">
            <span className="ig-muted">✕</span>
            <span className="ig-bar-title">{labels.menuAdd}</span>
            <span className="ig-link ig-hot">{labels.add}</span>
          </div>
          <div className="ig-app-row">
            <img src="/icon-192.png" alt="" />
            <div>
              <div className="ig-field">booktabib</div>
              <div className="ig-line w70" />
            </div>
          </div>
        </div>
      ) : (
        <Page />
      )}
      {step === 1 && (
        <div className="ig-sheet-ios">
          <div className="ig-grab" />
          <div className="ig-row">
            {labels.menuCopy}
            <span className="ig-row-icon">⧉</span>
          </div>
          <div className="ig-row">
            {labels.menuBookmark}
            <span className="ig-row-icon">☆</span>
          </div>
          <div className="ig-row ig-hot">
            {labels.menuAdd}
            <span className="ig-row-icon">
              <PlusSquare />
            </span>
          </div>
        </div>
      )}
      {step === 0 && (
        <div className="ig-safari">
          <div className="ig-address">booktabib.com</div>
          <div className="ig-toolbar">
            <span>‹</span>
            <span className="ig-muted">›</span>
            <span className="ig-hot">
              <ShareIcon />
            </span>
            <span>▢</span>
            <span>⧉</span>
          </div>
        </div>
      )}
    </div>
  )
}

function AndroidPicture({ step, labels }: { step: number; labels: InstallLabels }) {
  if (step === 3)
    return (
      <div className="ig-phone">
        <Home labels={labels} />
      </div>
    )
  return (
    <div className="ig-phone">
      <div className="ig-chrome">
        <div className="ig-address">booktabib.com</div>
        <span className={step === 0 ? 'ig-dots-menu ig-hot' : 'ig-dots-menu'}>⋮</span>
      </div>
      <Page />
      {step === 1 && (
        <div className="ig-menu-android">
          <div className="ig-row">{labels.menuBookmark}</div>
          <div className="ig-row">{labels.menuCopy}</div>
          <div className="ig-row ig-hot">
            <PlusSquare />
            {labels.menuAdd}
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="ig-dialog-android">
          <div className="ig-app-row">
            <img src="/icon-192.png" alt="" />
            <div className="ig-field">booktabib</div>
          </div>
          <div className="ig-dialog-actions">
            <span className="ig-muted">✕</span>
            <span className="ig-link ig-hot">{labels.install}</span>
          </div>
        </div>
      )}
    </div>
  )
}
