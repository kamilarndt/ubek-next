import { db } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import {
  users,
  projects,
  sessions,
  vaultFiles,
  extensions,
  extensionRequests,
  ragChunks,
  userFacts,
  auditLog,
} from '@/drizzle/schema'

export const userStore = {
  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return result[0] || null
  },

  async findByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return result[0] || null
  },

  async create(data: { email: string; passwordHash: string; name?: string }) {
    const result = await db.insert(users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name || '',
    }).returning()
    return result[0]
  },
}

export const projectStore = {
  async findById(id: string) {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
    return result[0] || null
  },

  async findByUserId(userId: string) {
    return db.select().from(projects).where(eq(projects.userId, userId))
  },

  async create(data: { userId: string; name: string; instructions?: string }) {
    const result = await db.insert(projects).values({
      userId: data.userId,
      name: data.name,
      instructions: data.instructions || '',
    }).returning()
    return result[0]
  },

  async update(id: string, data: { name?: string; instructions?: string }) {
    const result = await db.update(projects).set(data).where(eq(projects.id, id)).returning()
    return result[0] || null
  },

  async delete(id: string) {
    await db.delete(projects).where(eq(projects.id, id))
  },
}

export const sessionStore = {
  async findById(id: string) {
    const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    return result[0] || null
  },

  async findByProjectId(projectId: string) {
    return db.select().from(sessions).where(eq(sessions.projectId, projectId))
  },

  async create(data: { id: string; userId: string; projectId: string; title?: string }) {
    const result = await db.insert(sessions).values({
      id: data.id,
      userId: data.userId,
      projectId: data.projectId,
      title: data.title || 'Nowa rozmowa',
    }).returning()
    return result[0]
  },

  async update(id: string, data: { title?: string }) {
    const result = await db.update(sessions).set(data).where(eq(sessions.id, id)).returning()
    return result[0] || null
  },
}

export const vaultStore = {
  async update(id: string, data: Record<string, unknown>) {
    const result = await db.update(vaultFiles).set(data).where(eq(vaultFiles.id, id)).returning()
    return result[0] || null
  },
  async findById(id: string) {
    const result = await db.select().from(vaultFiles).where(eq(vaultFiles.id, id)).limit(1)
    return result[0] || null
  },

  async findByUserId(userId: string) {
    return db.select().from(vaultFiles).where(eq(vaultFiles.userId, userId))
  },

  async findByProjectId(projectId: string) {
    return db.select().from(vaultFiles).where(eq(vaultFiles.projectId, projectId))
  },

  async create(data: { userId: string; filename: string; originalName: string; size?: number; mimeType?: string; folder?: string }) {
    const result = await db.insert(vaultFiles).values({
      userId: data.userId,
      filename: data.filename,
      originalName: data.originalName,
      size: data.size || 0,
      mimeType: data.mimeType || 'application/octet-stream',
      folder: data.folder || '/',
    }).returning()
    return result[0]
  },
}
