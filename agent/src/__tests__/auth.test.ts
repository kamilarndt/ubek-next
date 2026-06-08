import { describe, it, expect, vi } from 'vitest'
import { createAuthMiddleware } from '../middleware/auth'

describe('Auth Middleware', () => {
  const jwtSecret = 'test-secret'
  const agentApiKey = 'agent-key-123'

  it('should allow request with valid JWT and AGENT_API_KEY', async () => {
    const jwt = await createTestJWT(jwtSecret, 'user-1')

    const req = {
      headers: {
        authorization: `Bearer ${jwt}`,
        'x-agent-api-key': agentApiKey,
      },
    } as any

    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any
    const next = vi.fn()

    const middleware = createAuthMiddleware(jwtSecret, agentApiKey)
    await middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.userId).toBe('user-1')
  })

  it('should reject missing AGENT_API_KEY', async () => {
    const jwt = await createTestJWT(jwtSecret, 'user-1')

    const req = {
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    } as any
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any
    const next = vi.fn()

    const middleware = createAuthMiddleware(jwtSecret, agentApiKey)
    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('should reject invalid JWT', async () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid-token',
        'x-agent-api-key': agentApiKey,
      },
    } as any
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any
    const next = vi.fn()

    const middleware = createAuthMiddleware(jwtSecret, agentApiKey)
    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('should reject missing Authorization header', async () => {
    const req = {
      headers: {
        'x-agent-api-key': agentApiKey,
      },
    } as any
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any
    const next = vi.fn()

    const middleware = createAuthMiddleware(jwtSecret, agentApiKey)
    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})

async function createTestJWT(
  secret: string,
  userId: string,
): Promise<string> {
  const jwt = await import('jsonwebtoken')
  return jwt.default.sign({ sub: userId }, secret, { expiresIn: '1h' })
}
