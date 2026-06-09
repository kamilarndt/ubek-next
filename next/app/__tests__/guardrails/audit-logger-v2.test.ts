import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn().mockResolvedValue({ id: 'log-1' })
vi.mock('@/lib/store', () => ({
  auditLogStore: { create: mockCreate },
}))

describe('AuditLogger v2', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should log login action', async () => {
    const { logAudit } = await import('@/lib/audit-logger')
    await logAudit({ userId: 'user-1', action: 'USER_LOGIN' })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_LOGIN', userId: 'user-1' }),
    )
  })

  it('should not throw on error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB error'))
    const { logAudit } = await import('@/lib/audit-logger')
    await expect(logAudit({ userId: 'user-1', action: 'CHAT_MESSAGE' })).resolves.toBeUndefined()
  })

  it('should include metadata', async () => {
    const { logAudit } = await import('@/lib/audit-logger')
    await logAudit({ userId: 'user-1', action: 'VAULT_UPLOAD', resource: 'file', resourceId: 'file-1' })
    expect(mockCreate).toHaveBeenCalled()
    const callArg = mockCreate.mock.calls[0][0]
    expect(callArg.metadata.resource).toBe('file')
  })
})
