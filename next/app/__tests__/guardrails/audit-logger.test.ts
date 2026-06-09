import { describe, it, expect, vi, beforeEach } from 'vitest'

// Store imports `db` directly from '@/lib/db'
const mockReturning = vi.fn().mockResolvedValue([{ id: 'log-1', userId: 'user-123', action: 'USER_LOGIN', createdAt: new Date() }])
const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

const mockDb = {
  insert: mockInsert,
  select: vi.fn(),
}

vi.mock('@/lib/db', () => ({
  db: mockDb,
}))

describe('Audit Log Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create an audit log entry', async () => {
    const { auditLogStore } = await import('@/lib/store')

    const result = await auditLogStore.create({
      userId: 'user-123',
      action: 'USER_LOGIN',
      metadata: { ip: '127.0.0.1' },
    })

    expect(mockInsert).toHaveBeenCalled()
    expect(result).toBeDefined()
    expect(result.id).toBe('log-1')
  })

  it('should create audit log entry with different action', async () => {
    const { auditLogStore } = await import('@/lib/store')

    const result = await auditLogStore.create({
      userId: 'user-456',
      action: 'EXTENSION_REQUEST',
      metadata: { name: 'web-scraper' },
    })

    expect(result).toBeDefined()
  })

  it('should handle create without metadata', async () => {
    const { auditLogStore } = await import('@/lib/store')

    const result = await auditLogStore.create({
      userId: 'user-789',
      action: 'USER_LOGOUT',
    })

    expect(result).toBeDefined()
    expect(result.id).toBe('log-1')
  })
})
