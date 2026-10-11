'use client'

import { useRouter } from 'next/navigation'
import { setRenewalNotified } from '@/app/prescription-actions'
import { Icon } from './Icon'

/** Opens WhatsApp with the ready-made renewal message and ticks the patient as told. */
export function RenewalWhatsapp({ id, href, label }: { id: string; href: string; label: string }) {
  const router = useRouter()
  return (
    <a
      className="btn btn-sm"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        void setRenewalNotified(id, true).then(() => router.refresh())
      }}
    >
      <Icon name="phone" size={14} />
      {label}
    </a>
  )
}
