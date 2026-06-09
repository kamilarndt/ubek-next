import { NextRequest, NextResponse } from 'next/server'
import { userFactStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  const facts = await userFactStore.findByUserId(userId)
  return NextResponse.json(facts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, key, value } = body
  if (!userId || !key) {
    return NextResponse.json({ error: 'userId and key required' }, { status: 400 })
  }
  const fact = await userFactStore.create({ userId, key, value: value ?? '' })
  return NextResponse.json(fact)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const key = searchParams.get('key')
  if (!userId || !key) {
    return NextResponse.json({ error: 'userId and key required' }, { status: 400 })
  }
  await userFactStore.deleteByKey(userId, key)
  return NextResponse.json({ success: true })
}
