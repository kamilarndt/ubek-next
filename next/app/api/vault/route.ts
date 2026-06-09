import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { vaultStore } from '@/lib/store'
import fs from 'fs'
import path from 'path'

// Helper to get auth user id
async function getUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  const payload = await verifyToken(token, process.env.JWT_SECRET || 'secret')
  return payload.sub
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const files = await vaultStore.findByUserId(userId as string)
  // filter out soft‑deleted
  const visible = (files as any[]).filter((f) => !f.deletedAt)
  return NextResponse.json({ files: visible }, { status: 200 })
}

export async function POST(request: any) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Expect multipart/form-data
  const formData = typeof (request as any).formData === 'function' ? await (request as any).formData() : (request as any).body instanceof FormData ? (request as any).body : null
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  // Ensure directory exists
  try {
    await fs.promises.mkdir(uploadDir, { recursive: true })
    const filename = `${Date.now()}_${file.name}`
    const filePath = path.join(uploadDir, filename)
    const arrayBuffer = await file.arrayBuffer()
    await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer))
    const record = await vaultStore.create({
      userId: userId as string,
      filename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
    })
    return NextResponse.json({ file: record }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
