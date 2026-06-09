import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCookiesGet = vi.fn()

vi.mock('next/headers', () => ({
  cookies: () => ({ get: mockCookiesGet }),
}))

const mockVerifyToken = vi.fn()
vi.mock('@/lib/auth', () => ({ verifyToken: mockVerifyToken }))

const mockFindById = vi.fn()
const mockCreate = vi.fn()
vi.mock('@/lib/store', () => ({
  sessionStore: { findById: mockFindById, create: mockCreate },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

process.env.JWT_SECRET = 'test-jwt-secret'
process.env.AGENT_API_KEY = 'test-agent-api-key'

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
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('POST /api/chat/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ id: 'session-new', userId: 'user-123', projectId: 'default' })
    mockFindById.mockResolvedValue({ id: 'session-1', userId: 'user-123', messages: [] })
  })

  it('should return 401 when no token cookie', async () => {
    mockCookiesGet.mockReturnValue(undefined)
    const { POST } = await import('@/app/api/chat/stream/route')
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hi' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should return 401 when token is invalid', async () => {
    mockCookiesGet.mockReturnValue({ value: 'bad-token' })
    mockVerifyToken.mockRejectedValue(new Error('invalid'))
    const { POST } = await import('@/app/api/chat/stream/route')
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hi' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should return 200 with streaming response on success', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyToken.mockResolvedValue({ sub: 'user-123' })
    mockFetch.mockResolvedValue(createStreamingResponse('data: {"text":"hello"}\n\n'))

    const { POST } = await import('@/app/api/chat/stream/route')
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi', projectId: 'proj-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('should pass AGENT_API_KEY header in forwarded request', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyToken.mockResolvedValue({ sub: 'user-123' })
    mockFetch.mockResolvedValue(createStreamingResponse('data: {}'))

    const { POST } = await import('@/app/api/chat/stream/route')
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi' }),
    })
    await POST(req)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/chat/stream',
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-agent-api-key': 'test-agent-api-key' }),
      }),
    )
  })

  it('should pass Authorization Bearer token in forwarded request', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyToken.mockResolvedValue({ sub: 'user-123' })
    mockFetch.mockResolvedValue(createStreamingResponse('data: {}'))

    const { POST } = await import('@/app/api/chat/stream/route')
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi' }),
    })
    await POST(req)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/chat/stream',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer valid-token' }),
      }),
    )
  })

  it('should return 502 when upstream fails', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyToken.mockResolvedValue({ sub: 'user-123' })
    mockFetch.mockRejectedValue(new Error('Connection refused'))

    const { POST } = await import('@/app/api/chat/stream/route')
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(502)
  })
})
