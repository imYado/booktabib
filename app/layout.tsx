import type { Metadata, Viewport } from 'next'
import { Archivo, Hanken_Grotesk, Vazirmatn } from 'next/font/google'
import { dirFor } from '@/lib/i18n'
import { getI18n } from '@/lib/locale'
import './globals.css'

const archivo = Archivo({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-archivo', display: 'swap' })
const hanken = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-hanken', display: 'swap' })
const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-vazirmatn',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return {
    title: { default: `${t.brand}`, template: `%s · ${t.brand}` },
    description: t.tagline,
  }
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1a16' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n()
  return (
    <html lang={locale} dir={dirFor(locale)} className={`${archivo.variable} ${hanken.variable} ${vazirmatn.variable}`}>
      <body>{children}</body>
    </html>
  )
}
