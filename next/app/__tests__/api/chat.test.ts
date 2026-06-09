import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── mocks (must be top-level for hoisting) ───────────────────────────────────

const mockCookiesGet = vi.fn()

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: mockCookiesGet,
  }),
}))

// Partially mock @/lib/auth: keep real signToken, mock verifyToken
const mockVerifyToken = vi.fn()
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    verifyToken: mockVerifyToken,
  }
})

// Mock global fetch to mock upstream Pi Agent
const mockFetch = vi.fn()
global.fetch = mockFetch

// keep env stable
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.AGENT_API_KEY = 'test-agent-api-key'

// ── helpers ──────────────────────────────────────────────────────────────────

function createStreamingResponse(body: string): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('POST /api/chat/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when no token cookie', async () => {
    mockCookiesGet.mockReturnValue(undefined)

    const { POST } = await import('../../../app/api/chat/stream/route')
    const req = new Request('http://localhost/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })

    const res = await POST(req as any)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 401 when token is invalid', async () => {
    mockCookiesGet.mockReturnValue({ value: 'totally-bogus-token' })
    mockVerifyToken.mockRejectedValue(new Error('invalid token'))

    const { POST } = await import('../../../app/api/chat/stream/route')
    const req = new Request('http://localhost/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })

    const res = await POST(req as any)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 200 with streaming response on success', async () => {
    const { signToken } = await import('@/lib/auth')
    const token = await signToken({ sub: 'user-123', role: 'user' }, 'test-jwt-secret')

    mockCookiesGet.mockReturnValue({ value: token })
    mockVerifyToken.mockResolvedValue({ sub: 'user-123', role: 'user' })

    const upstreamBody = 'data: {"type":"text-delta","text":"Hello"}\n\n'
    mockFetch.mockResolvedValue(createStreamingResponse(upstreamBody))

    const { POST } = await import('../../../app/api/chat/stream/route')
    const req = new Request('http://localhost/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] }),
    })

    const res = await POST(req as any)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('should pass AGENT_API_KEY header in forwarded request', async () => {
    const { signToken } = await import('@/lib/auth')
    const token = await signToken({ sub: 'user-123', role: 'user' }, 'test-jwt-secret')

    mockCookiesGet.mockReturnValue({ value: token })
    mockVerifyToken.mockResolvedValue({ sub: 'user-123', role: 'user' })

    const upstreamBody = 'data: {"type":"text-delta","text":"Hello"}\n\n'
    mockFetch.mockResolvedValue(createStreamingResponse(upstreamBody))

    const { POST } = await import('../../../app/api/chat/stream/route')
    const req = new Request('http://localhost/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })

    await POST(req as any)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/chat/stream',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-agent-api-key': 'test-agent-api-key',
        }),
      }),
    )
  })

  it('should pass Authorization Bearer token in forwarded request', async () => {
    const { signToken } = await import('@/lib/auth')
    const token = await signToken({ sub: 'user-123', role: 'user' }, 'test-jwt-secret')

    mockCookiesGet.mockReturnValue({ value: token })
    mockVerifyToken.mockResolvedValue({ sub: 'user-123', role: 'user' })

    const upstreamBody = 'data: {"type":"text-delta","text":"Hello"}\n\n'
    mockFetch.mockResolvedValue(createStreamingResponse(upstreamBody))

    const { POST } = await import('../../../app/api/chat/stream/route')
    const req = new Request('http://localhost/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })

    await POST(req as any)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/chat/stream',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
        }),
      }),
    )
  })

  it('should return 502 when upstream fails', async () => {
    const { signToken } = await import('@/lib/auth')
    const token = await signToken({ sub: 'user-123', role: 'user' }, 'test-jwt-secret')

    mockCookiesGet.mockReturnValue({ value: token })
    mockVerifyToken.mockResolvedValue({ sub: 'user-123', role: 'user' })
    mockFetch.mockRejectedValue(new Error('Connection refused'))

    const { POST } = await import('../../../app/api/chat/stream/route')
    const req = new Request('http://localhost/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })

    const res = await POST(req as any)
    const body = await res.json()

    expect(res.status).toBe(502)
    expect(body.error).toMatch(/upstream/i)
  })
})
