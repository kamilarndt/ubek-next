import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { vaultStore } from '@/lib/store'
import fs from 'fs'
import path from 'path'
import { getConfig } from '@/lib/config'

const cfg = getConfig()
const UPLOAD_DIR_DEFAULT = cfg.uploadDir

// Note: path and fs used for defense-in-depth containment checks on every access.

async function getUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  const payload = await verifyToken(token, process.env.JWT_SECRET )
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
  const uploadDir = UPLOAD_DIR_DEFAULT
  const resolvedPath = path.resolve(uploadDir, file.filename)
  const allowedDir = path.resolve(uploadDir)
  if (!resolvedPath.startsWith(allowedDir + path.sep) && resolvedPath !== allowedDir) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }
  const filePath = resolvedPath
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

  // Soft delete by design (see schema deletedAt + recovery needs).
  // Files on disk are intentionally kept for a grace period / admin audit.
  // A future background job should unlink files where deletedAt < NOW() - retention.
  // We still perform the containment check for defense-in-depth.
  const uploadDir = UPLOAD_DIR_DEFAULT
  const resolvedPath = path.resolve(uploadDir, file.filename)
  const allowedDir = path.resolve(uploadDir)
  if (!resolvedPath.startsWith(allowedDir + path.sep) && resolvedPath !== allowedDir) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }
  await vaultStore.update(id, { deletedAt: new Date() })
  return NextResponse.json({ success: true })
}
