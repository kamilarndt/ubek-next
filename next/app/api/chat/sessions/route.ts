import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { sessionStore } from '@/lib/store'
import { randomUUID } from 'crypto'

function getTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|; )token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function GET(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET || 'secret')
    const sessions = await sessionStore.findByUserId(payload.sub)
    return NextResponse.json(sessions)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET || 'secret')
    const body = await req.json()
    const session = await sessionStore.create({
      id: randomUUID(),
      userId: payload.sub,
      projectId: body.projectId || null,
      title: body.title || 'Nowa rozmowa',
    })
    return NextResponse.json(session, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
