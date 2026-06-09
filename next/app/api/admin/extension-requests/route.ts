import { NextRequest, NextResponse } from 'next/server'
import { extensionRequestStore } from '@/lib/store'

export async function GET() {
  const requests = await extensionRequestStore.list()
  return NextResponse.json(requests)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id, status } = body
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  }
  const updated = await extensionRequestStore.updateStatus(id, status)
  return NextResponse.json(updated)
}
