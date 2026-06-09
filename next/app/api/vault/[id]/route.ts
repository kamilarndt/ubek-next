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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const file = await vaultStore.findById(id)
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (file.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  const filePath = path.join(uploadDir, file.filename)
  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
    },
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const file = await vaultStore.findById(id)
  if (!file) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  if (file.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await vaultStore.update(id, { deletedAt: new Date() })
  return NextResponse.json({ success: true })
}
