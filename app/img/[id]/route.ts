import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { images } from '@/db/schema'

/** Serves an uploaded clinic or doctor photo. A replaced photo gets a new id, so these never change. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[A-Z0-9]{16}$/.test(id)) return new Response('Not found', { status: 404 })
  const db = await getDb()
  const [row] = await db.select().from(images).where(eq(images.id, id)).limit(1)
  if (!row) return new Response('Not found', { status: 404 })
  return new Response(Buffer.from(row.data, 'base64'), {
    headers: {
      'Content-Type': row.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
