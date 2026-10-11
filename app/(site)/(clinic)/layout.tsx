import { SiteHeader } from '@/components/SiteHeader'

// Clinic and doctor pages are often opened from a link the clinic shared, so the header is pared down.
export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader minimal />
      <main>{children}</main>
    </>
  )
}
