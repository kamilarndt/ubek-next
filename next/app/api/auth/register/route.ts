import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { createRateLimiter, getUserKey } from '@/lib/guardrails/rate-limiter'
import { scanInput } from '@/lib/guardrails/injection-detector'

const limiter = createRateLimiter(5, 60 * 1000)

export async function POST(req: Request) {
  try {
    const key = getUserKey(req)
    const limit = limiter.check(key)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { email, password, displayName } = await req.json()

    // basic validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const emailScan = scanInput(email)
    const passwordScan = scanInput(password)
    const nameScan = scanInput(displayName || '')
    if (!emailScan.safe || !passwordScan.safe || !nameScan.safe) {
      return NextResponse.json({ error: 'Suspicious input detected' }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const db = getDb()
    const existing = await db.select().from(users).where(eq(users.email, email))
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const inserted = await db
      .insert(users)
      .values({ email, passwordHash, name: displayName ?? '' })
      .returning({ id: users.id, email: users.email, name: users.name })

    const user = inserted[0]
    const responseBody = { user: { id: user.id, email: user.email, displayName: user.name } }
    return NextResponse.json(responseBody, { status: 201 })
  } catch (err) {
    const { logError } = await import('@/lib/safe-log')
    logError('auth/register', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
