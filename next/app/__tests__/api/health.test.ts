import { describe, it, expect } from 'vitest'

describe('GET /api/health', () => {
  it('should return 200 with status ok', async () => {
    const { GET } = await import('../../../app/api/health/route')
    const res = await GET()
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.timestamp).toBeDefined()
    expect(typeof data.uptime).toBe('number')
  })
})
