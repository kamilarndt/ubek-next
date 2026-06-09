import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { sessionStore } from '@/lib/store'

const AGENT_API_KEY = process.env.AGENT_API_KEY
const PI_AGENT_URL = process.env.PI_AGENT_URL || 'http://localhost:4000'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = process.env.JWT_SECRET
  if (!secret) return NextResponse.json({ error: 'Server config error' }, { status: 500 })

  let payload: { chatId?: string; message: string; projectId?: string }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!payload.message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  let userSub: string
  try {
    userSub = (await verifyToken(token, secret)).sub
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chatId, message, projectId } = payload
  let session
  if (chatId) {
    session = await sessionStore.findById(chatId)
    if (!session || session.userId !== userSub) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  } else {
    const { randomUUID } = await import('crypto')
    session = await sessionStore.create({
      id: randomUUID(),
      userId: userSub,
      projectId: projectId || 'default',
      title: message.slice(0, 80) || 'Nowa rozmowa',
    })
  }

  try {
    const upstreamRes = await fetch(`${PI_AGENT_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-agent-api-key': AGENT_API_KEY || '',
      },
      body: JSON.stringify({ message, chatId: session.id, projectId: session.projectId }),
    })
    if (!upstreamRes.ok) return NextResponse.json({ error: `Upstream error: ${upstreamRes.status}` }, { status: 502 })
    const stream = upstreamRes.body
    if (!stream) return NextResponse.json({ error: 'Upstream missing body' }, { status: 502 })
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'x-chat-session-id': session.id,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Upstream connection failed' }, { status: 502 })
  }
}
