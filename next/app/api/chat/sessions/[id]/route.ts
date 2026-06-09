import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { sessionStore } from '@/lib/store'

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
    const payload = await verifyToken(token, process.env.JWT_SECRET! )
    const session = await sessionStore.findById(id)
    if (!session) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    if (session.userId !== payload.sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET! )
    const existing = await sessionStore.findById(id)
    if (!existing) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    if (existing.userId !== payload.sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const updated = await sessionStore.update(id, { title: body.title })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const token = getTokenFromRequest(_req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET! )
    const existing = await sessionStore.findById(id)
    if (!existing) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    if (existing.userId !== payload.sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await sessionStore.delete(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
