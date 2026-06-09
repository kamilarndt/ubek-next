import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSession = {
  id: 's1',
  userId: 'user-123',
  projectId: 'default',
  title: 'Test Chat',
  messages: [{ role: 'user', content: 'hello' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}))

vi.mock('@/lib/store', () => ({
  sessionStore: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByProjectId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { verifyToken } from '@/lib/auth'
import { sessionStore } from '@/lib/store'

const mockedVerifyToken = vi.mocked(verifyToken)

function mockRequest(method: string, body?: unknown, token = 'valid-token'): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['cookie'] = `token=${token}`
  }
  const req = new Request('http://localhost', {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  return req
}

describe('GET /api/chat/sessions', () => {
  beforeEach(() => { vi.clearAllMocks(); mockedVerifyToken.mockResolvedValue({ sub: 'user-123' }) })

  it('returns sessions list', async () => {
    vi.mocked(sessionStore.findByUserId).mockResolvedValue([mockSession])
    const { GET } = await import('@/app/api/chat/sessions/route')
    const res = await GET(mockRequest('GET'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({ title: 'Test Chat', userId: 'user-123' })
  })

  it('returns 401 without token', async () => {
    const { GET } = await import('@/app/api/chat/sessions/route')
    const res = await GET(mockRequest('GET', undefined, ''))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/chat/sessions', () => {
  beforeEach(() => { vi.clearAllMocks(); mockedVerifyToken.mockResolvedValue({ sub: 'user-123' }) })

  it('creates session', async () => {
    vi.mocked(sessionStore.create).mockResolvedValue(mockSession)
    const { POST } = await import('@/app/api/chat/sessions/route')
    const res = await POST(mockRequest('POST', { title: 'Test Chat' }))
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.title).toBe('Test Chat')
  })
})

describe('GET /api/chat/sessions/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); mockedVerifyToken.mockResolvedValue({ sub: 'user-123' }) })

  it('returns session', async () => {
    vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
    const { GET } = await import('@/app/api/chat/sessions/[id]/route')
    const res = await GET(mockRequest('GET'), { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
  })

  it('returns 404 if not found', async () => {
    vi.mocked(sessionStore.findById).mockResolvedValue(null)
    const { GET } = await import('@/app/api/chat/sessions/[id]/route')
    const res = await GET(mockRequest('GET'), { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns 403 for other user session', async () => {
    vi.mocked(sessionStore.findById).mockResolvedValue({ ...mockSession, userId: 'other-user' })
    const { GET } = await import('@/app/api/chat/sessions/[id]/route')
    const res = await GET(mockRequest('GET'), { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/chat/sessions/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); mockedVerifyToken.mockResolvedValue({ sub: 'user-123' }) })

  it('deletes session', async () => {
    vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
    vi.mocked(sessionStore.delete).mockResolvedValue(undefined as never)
    const { DELETE } = await import('@/app/api/chat/sessions/[id]/route')
    const res = await DELETE(mockRequest('DELETE'), { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})

describe('GET /api/chat/sessions/[id]/messages', () => {
  beforeEach(() => { vi.clearAllMocks(); mockedVerifyToken.mockResolvedValue({ sub: 'user-123' }) })

  it('returns messages', async () => {
    const mockDb = (await import('@/lib/db')).db
    vi.mocked(mockDb.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockSession])),
        })),
      })),
    } as never)
    const { GET } = await import('@/app/api/chat/sessions/[id]/messages/route')
    const res = await GET(mockRequest('GET'), { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({ content: 'hello', role: 'user' })
  })
})
