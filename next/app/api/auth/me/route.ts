import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token, process.env.JWT_SECRET )

    const db = getDb()
    const found = await db.select().from(users).where(eq(users.id, payload.sub))
    if (!found || found.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = found[0]
    const responseBody = { user: { id: user.id, email: user.email, displayName: user.name, role: user.role } }
    return NextResponse.json(responseBody, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
