import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { sessions } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

function getTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|; )token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const token = getTokenFromRequest(_req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET )
    const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    const session = rows[0]
    if (!session) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    if (session.userId !== payload.sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json(session.messages || [])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET )
    const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    const session = rows[0]
    if (!session) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    if (session.userId !== payload.sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    await db.update(sessions).set({ messages: body.messages || [] }).where(eq(sessions.id, id))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
