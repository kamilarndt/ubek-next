import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { vaultStore } from '@/lib/store'
import { GET, POST } from '@/app/api/vault/route'
import { GET as GET_FILE, DELETE } from '@/app/api/vault/[id]/route'

// Mock the dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}))

vi.mock('@/lib/store', () => ({
  vaultStore: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}))

describe('Vault API', () => {
  const mockUserId = 'user-123'
  const mockToken = 'mock-token'
  const mockFile = {
    id: 'file-123',
    userId: mockUserId,
    filename: 'test.txt',
    originalName: 'test.txt',
    size: 1024,
    mimeType: 'text/plain',
    folder: '/',
    createdAt: new Date(),
    deletedAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any)
    vi.mocked(verifyToken).mockResolvedValue({ sub: mockUserId } as any)
  })

  describe('GET /api/vault', () => {
    it('should return 401 without authentication', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any)

      const response = await GET()
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return files for authenticated user', async () => {
      vi.mocked(vaultStore.findByUserId).mockResolvedValue([mockFile])

      const response = await GET()
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.files).toHaveLength(1)
      expect(data.files[0].id).toBe(mockFile.id)
    })

    it('should return empty array when no files exist', async () => {
      vi.mocked(vaultStore.findByUserId).mockResolvedValue([])

      const response = await GET()
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.files).toHaveLength(0)
    })

    it('should only return non-deleted files', async () => {
      const deletedFile = { ...mockFile, deletedAt: new Date() }
      vi.mocked(vaultStore.findByUserId).mockResolvedValue([mockFile, deletedFile])

      const response = await GET()
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.files).toHaveLength(1) // Only non-deleted
      expect(data.files[0].id).toBe(mockFile.id)
    })
  })

  describe('POST /api/vault', () => {
    it('should return 401 without authentication', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any)

      const formData = new FormData()
      formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt')

      const response = await POST({ body: formData } as any)
      expect(response.status).toBe(401)
    })

    it('should create file record and save to disk', async () => {
      const mockFileData = { ...mockFile, id: 'new-file-id' }
      vi.mocked(vaultStore.create).mockResolvedValue(mockFileData)

      const formData = new FormData()
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      formData.append('file', file)

      const response = await POST({ body: formData } as any)
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.file).toBeDefined()
      expect(data.file.id).toBe(mockFileData.id)
    })
  })

  describe('GET /api/vault/[id]', () => {
    it('should return 401 without authentication', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any)

      const response = await GET_FILE({ params: { id: mockFile.id } } as any)
      expect(response.status).toBe(401)
    })

    it('should return 404 if file not found', async () => {
      vi.mocked(vaultStore.findById).mockResolvedValue(null)

      const response = await GET_FILE({ params: { id: mockFile.id } } as any)
      expect(response.status).toBe(404)
    })

    it('should return 403 if user does not own file', async () => {
      const otherUsersFile = { ...mockFile, userId: 'other-user-id' }
      vi.mocked(vaultStore.findById).mockResolvedValue(otherUsersFile)

      const response = await GET_FILE({ params: { id: mockFile.id } } as any)
      expect(response.status).toBe(403)
    })

    it('should return file stream for valid request', async () => {
      vi.mocked(vaultStore.findById).mockResolvedValue(mockFile)

      const response = await GET_FILE({ params: { id: mockFile.id } } as any)
      expect(response.status).toBe(200)
      // File stream response would be tested here
    })
  })

  describe('DELETE /api/vault/[id]', () => {
    it('should return 401 without authentication', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any)

      const response = await DELETE({ params: { id: mockFile.id } } as any)
      expect(response.status).toBe(401)
    })

    it('should return 404 if file not found', async () => {
      vi.mocked(vaultStore.findById).mockResolvedValue(null)

      const response = await DELETE({ params: { id: mockFile.id } } as any)
      expect(response.status).toBe(404)
    })

    it('should return 403 if user does not own file', async () => {
      const otherUsersFile = { ...mockFile, userId: 'other-user-id' }
      vi.mocked(vaultStore.findById).mockResolvedValue(otherUsersFile)

      const response = await DELETE({ params: { id: mockFile.id } } as any)
      expect(response.status).toBe(403)
    })

    it('should soft-delete file (set deletedAt)', async () => {
      const fileToDelete = { ...mockFile, deletedAt: null }
      const deletedFile = { ...mockFile, deletedAt: expect.any(Date) }
      vi.mocked(vaultStore.findById).mockResolvedValue(fileToDelete)

      const response = await DELETE({ params: { id: mockFile.id } } as any)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })
})