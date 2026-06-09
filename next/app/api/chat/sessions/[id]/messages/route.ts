import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { withTransaction } from '@/lib/db'
import { sessionStore } from '@/lib/store'
import { getConfig } from '@/lib/config'

const { jwtSecret: JWT_SECRET } = getConfig()

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
    const payload = await verifyToken(token, JWT_SECRET)
    const session = await sessionStore.findById(id)
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
    const payload = await verifyToken(token, JWT_SECRET)
    const session = await sessionStore.findById(id)
    if (!session) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    if (session.userId !== payload.sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const newMessages = body.messages || []
    await withTransaction(async () => {
      // Use store inside tx context for consistency. Always touch updatedAt so
      // clients see fresh timestamp. This reduces "stale history" risk from
      // client-driven persistence (audit ID10).
      await sessionStore.update(id, {
        messages: newMessages,
        updatedAt: new Date(),
      })
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
