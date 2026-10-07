'use client'

/** A submit button that asks before something is deleted for good. */
export function ConfirmButton({ label, question, className = 'btn btn-secondary btn-sm' }: { label: string; question: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(question)) e.preventDefault()
      }}
    >
      {label}
    </button>
  )
}
