import { db } from './db'
import { eq, desc, and } from 'drizzle-orm'
import {
  users,
  projects,
  sessions,
  vaultFiles,
  extensions,
  projectExtensions,
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

  async findByUserId(userId: string) {
    return db.select().from(sessions).where(eq(sessions.userId, userId))
  },

  async create(data: { id: string; userId: string; projectId: string | null; title?: string }) {
    const result = await db.insert(sessions).values({
      id: data.id,
      userId: data.userId,
      projectId: data.projectId,
      title: data.title || 'Nowa rozmowa',
    }).returning()
    return result[0]
  },

  async update(id: string, data: { title?: string; messages?: any }) {
    const result = await db.update(sessions).set(data).where(eq(sessions.id, id)).returning()
    return result[0] || null
  },

  async delete(id: string) {
    await db.delete(sessions).where(eq(sessions.id, id))
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

/** Store for managing extensions registry */
export const extensionStore = {
  /** Find extension by ID */
  async findById(id: string) {
    const result = await db.select().from(extensions).where(eq(extensions.id, id)).limit(1)
    return result[0] || null
  },

  /** List all extensions */
  async list() {
    return db.select().from(extensions)
  },

  /** Create a new extension */
  async create(data: { id: string; name: string; description?: string; hasUi?: boolean; icon?: string }) {
    const result = await db.insert(extensions).values({
      id: data.id,
      name: data.name,
      description: data.description || '',
      hasUi: data.hasUi || false,
      icon: data.icon || 'puzzle',
    }).returning()
    return result[0]
  },

  /** Update an extension */
  async update(id: string, data: { name?: string; description?: string; hasUi?: boolean; icon?: string }) {
    const result = await db.update(extensions).set(data).where(eq(extensions.id, id)).returning()
    return result[0] || null
  },

  /** Delete an extension by ID */
  async delete(id: string) {
    await db.delete(extensions).where(eq(extensions.id, id))
  },
}

/** Store for managing project–extension assignments */
export const projectExtensionStore = {
  /** Assign an extension to a project */
  async create(data: { projectId: string; extensionId: string; config?: Record<string, unknown> }) {
    const result = await db.insert(projectExtensions).values({
      projectId: data.projectId,
      extensionId: data.extensionId,
      config: data.config || {},
    }).returning()
    return result[0]
  },

  /** Get all extensions assigned to a project */
  async findByProjectId(projectId: string) {
    return db.select().from(projectExtensions).where(eq(projectExtensions.projectId, projectId))
  },

  /** Remove an extension assignment from a project */
  async delete(projectId: string, extensionId: string) {
    await db.delete(projectExtensions).where(
      and(
        eq(projectExtensions.projectId, projectId),
        eq(projectExtensions.extensionId, extensionId),
      ),
    )
  },
}

/** Store for managing user extension requests */
export const extensionRequestStore = {
  /** Find extension request by ID */
  async findById(id: string) {
    const result = await db.select().from(extensionRequests).where(eq(extensionRequests.id, id)).limit(1)
    return result[0] || null
  },

  /** List extension requests, optionally filtered by user or status */
  async list(filters?: { userId?: string; status?: string }) {
    const conditions = []
    if (filters?.userId) {
      conditions.push(eq(extensionRequests.userId, filters.userId))
    }
    if (filters?.status) {
      conditions.push(eq(extensionRequests.status, filters.status))
    }
    if (conditions.length > 0) {
      return db.select().from(extensionRequests).where(and(...conditions))
    }
    return db.select().from(extensionRequests)
  },

  /** Create a new extension request */
  async create(data: { userId: string; title: string; description: string; priority?: string }) {
    const result = await db.insert(extensionRequests).values({
      userId: data.userId,
      title: data.title,
      description: data.description,
      priority: data.priority || 'medium',
    }).returning()
    return result[0]
  },

  /** Update extension request status (with optional admin notes) */
  async updateStatus(id: string, data: { status: string; adminNotes?: string }) {
    const result = await db.update(extensionRequests).set({
      status: data.status,
      adminNotes: data.adminNotes,
      updatedAt: new Date(),
    }).where(eq(extensionRequests.id, id)).returning()
    return result[0] || null
  },
}

/** Store for managing RAG chunks */
export const ragChunkStore = {
  /** Create a new RAG chunk */
  async create(data: {
    projectId: string
    fileId?: string
    position: number
    content: string
    embedding?: number[]
    metadata?: Record<string, unknown>
  }) {
    const result = await db.insert(ragChunks).values({
      projectId: data.projectId,
      fileId: data.fileId || null,
      position: data.position,
      content: data.content,
      embedding: data.embedding || [],
      metadata: data.metadata || {},
    }).returning()
    return result[0]
  },

  /** Get all RAG chunks for a specific file */
  async findByFileId(fileId: string) {
    return db.select().from(ragChunks).where(eq(ragChunks.fileId, fileId))
  },

  /** Get all RAG chunks for a project */
  async findByProjectId(projectId: string) {
    return db.select().from(ragChunks).where(eq(ragChunks.projectId, projectId))
  },

  /** Delete all RAG chunks for a given file */
  async deleteByFileId(fileId: string) {
    await db.delete(ragChunks).where(eq(ragChunks.fileId, fileId))
  },
}

/** Store for managing user facts (key-value memory) */
export const userFactStore = {
  /** Create or overwrite a fact for a user */
  async create(data: { userId: string; key: string; value: unknown }) {
    const result = await db.insert(userFacts).values({
      userId: data.userId,
      key: data.key,
      value: data.value,
    }).returning()
    return result[0]
  },

  /** Get all facts for a user */
  async findByUserId(userId: string) {
    return db.select().from(userFacts).where(eq(userFacts.userId, userId))
  },

  /** Get a specific fact by user and key */
  async findByKey(userId: string, key: string) {
    const result = await db.select().from(userFacts).where(
      and(eq(userFacts.userId, userId), eq(userFacts.key, key)),
    ).limit(1)
    return result[0] || null
  },

  /** Delete a user fact by ID */
  async delete(id: string) {
    await db.delete(userFacts).where(eq(userFacts.id, id))
  },

  /** Delete a user fact by userId and key */
  async deleteByKey(userId: string, key: string) {
    await db.delete(userFacts).where(
      and(eq(userFacts.userId, userId), eq(userFacts.key, key)),
    )
  },
}

/** Store for managing audit log entries */
export const auditLogStore = {
  /** Create a new audit log entry */
  async create(data: { userId: string; action: string; metadata?: Record<string, unknown> }) {
    const result = await db.insert(auditLog).values({
      userId: data.userId,
      action: data.action,
      metadata: data.metadata || {},
    }).returning()
    return result[0]
  },

  /** List audit log entries, optionally filtered by userId, sorted newest first */
  async list(filters?: { userId?: string; limit?: number }) {
    const query = db.select().from(auditLog).orderBy(desc(auditLog.createdAt))
    if (filters?.userId) {
      return query.where(eq(auditLog.userId, filters.userId))
    }
    return query
  },
}
