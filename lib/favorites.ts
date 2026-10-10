import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { favorites } from '@/db/schema'
import { getCurrentUser } from './auth'

/** Ids of the clinics the signed-in user has hearted, oldest first. Empty when signed out. */
export async function getFavoriteIds(): Promise<string[]> {
  const user = await getCurrentUser()
  if (!user) return []
  const db = await getDb()
  const rows = await db
    .select({ clinicId: favorites.clinicId })
    .from(favorites)
    .where(eq(favorites.userId, user.id))
    .orderBy(asc(favorites.createdAt))
  return rows.map((r) => r.clinicId)
}
