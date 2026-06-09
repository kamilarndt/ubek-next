import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

const AGENT_API_KEY = process.env.AGENT_API_KEY

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET not configured')
  }

  // Verify JWT — throws on invalid token
  try {
    await verifyToken(token, secret)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Forward to Pi Agent
  const upstreamUrl = 'http://localhost:4000/api/chat/stream'

  const body = await req.text()

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('content-type') || 'application/json',
        Authorization: `Bearer ${token}`,
        'x-agent-api-key': AGENT_API_KEY || '',
      },
      body,
    })

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamRes.status}` },
        { status: 502 },
      )
    }

    const stream = upstreamRes.body
    if (!stream) {
      return NextResponse.json({ error: 'Upstream missing body' }, { status: 502 })
    }

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': upstreamRes.headers.get('content-type') || 'text/event-stream',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Upstream connection failed' }, { status: 502 })
  }
}

export const runtime = 'nodejs'
