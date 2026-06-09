import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { comparePassword, signToken } from '@/lib/auth'
import { users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const db = getDb()
    const found = await db.select().from(users).where(eq(users.email, email))
    const user = found?.[0]

    const valid = await comparePassword(
      password,
      user?.passwordHash || '$2a$10$0000000000000000000000000000000000000000000',
    )
    if (!user || !valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret'
    )

    const cookieStore = await cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    const responseBody = { user: { id: user.id, email: user.email, displayName: user.name } }
    return NextResponse.json(responseBody, { status: 200 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
