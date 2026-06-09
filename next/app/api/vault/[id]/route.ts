import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { vaultStore } from '@/lib/store'
import fs from 'fs'
import path from 'path'

async function getUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  const payload = await verifyToken(token, process.env.JWT_SECRET || 'secret')
  return payload.sub
}

export async function GET({ params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const file = await vaultStore.findById(params.id)
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (file.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  const filePath = path.join(uploadDir, file.filename)
  const stream = fs.createReadStream(filePath)
  return new NextResponse(stream, { status: 200 })
}

export async function DELETE({ params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const file = await vaultStore.findById(params.id)
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (file.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // soft delete by setting deletedAt
  await vaultStore.update && vaultStore.update(params.id, { deletedAt: new Date() })
  return NextResponse.json({ success: true }, { status: 200 })
}
