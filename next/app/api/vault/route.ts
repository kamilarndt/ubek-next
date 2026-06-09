import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { vaultStore } from '@/lib/store'
import fs from 'fs'
import path from 'path'
import { getConfig } from '@/lib/config'

const cfg = getConfig()
const MAX_FILE_SIZE = cfg.maxFileSize
const UPLOAD_DIR_DEFAULT = cfg.uploadDir

const ALLOWED_MIME_TYPES = [
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-tar',
  'application/gzip',
]

// Helper to get auth user id
async function getUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  const payload = await verifyToken(token, process.env.JWT_SECRET! )
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
  const projectId = (formData.get('projectId') as string) || null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File exceeds maximum size of ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` },
      { status: 400 },
    )
  }
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `File type '${file.type}' is not allowed` },
      { status: 400 },
    )
  }
  const uploadDir = UPLOAD_DIR_DEFAULT
  // Ensure directory exists
  try {
    await fs.promises.mkdir(uploadDir, { recursive: true })
    // Sanitize original name for storage/display safety
    const safeOriginal = (file.name || 'file').replace(/[\\/]/g, '_').replace(/\.\./g, '_').slice(0, 200)
    const ext = path.extname(safeOriginal) || path.extname(file.name) || ''
    const filename = `${crypto.randomUUID()}${ext}`
    const resolvedPath = path.resolve(uploadDir, filename)
    const allowedDir = path.resolve(uploadDir)
    if (!resolvedPath.startsWith(allowedDir + path.sep) && resolvedPath !== allowedDir) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    const filePath = resolvedPath
    const arrayBuffer = await file.arrayBuffer()
    await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer))
    try {
      const record = await vaultStore.create({
        userId: userId as string,
        filename,
        originalName: safeOriginal,
        size: file.size,
        mimeType: file.type,
        // project association if provided (for RAG scoping)
        ...(projectId ? { projectId } : {}),
      })

      // Basic RAG ingestion for text files (addresses missing KB population on upload).
      // Only for safe text types; PDF/DOCX would require additional parsers (future).
      const TEXT_MIME = ['text/plain', 'text/markdown', 'text/csv']
      if (projectId && file.type && TEXT_MIME.includes(file.type)) {
        try {
          const text = await file.text()
          const { chunkText, embedText } = await import('@/lib/rag')
          const { ragChunkStore } = await import('@/lib/store')
          const chunks = chunkText(text, 800) // ~reasonable size for Phase 1
          for (let i = 0; i < chunks.length; i++) {
            const embedding = await embedText(chunks[i])
            await ragChunkStore.create({
              projectId,
              fileId: record.id,
              position: i,
              content: chunks[i],
              embedding,
              metadata: { source: safeOriginal, mime: file.type },
            })
          }
        } catch (ragErr) {
          // Best effort: do not fail the upload if RAG fails
          const { logError } = await import('@/lib/safe-log')
          logError('vault/rag-ingest', ragErr, { projectId, fileId: record.id })
        }
      }

      return NextResponse.json({ file: record }, { status: 201 })
    } catch (dbErr) {
      // Clean up file if DB insert fails
      try { await fs.promises.unlink(filePath); } catch { /* ignore cleanup errors */ }
      return NextResponse.json({ error: "Upload failed: database error" }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
