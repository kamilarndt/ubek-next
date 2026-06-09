import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChatRouter } from '../routes/chat'
import { UserSessionPool } from '../services/SessionPool'
import { ExtensionRegistry } from '../services/Registry'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

function mockResponse(): any {
  const chunks: string[] = []
  const res: any = {
    chunks,
    statusCode: 200,
    jsonData: null,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(data: any) {
      res.jsonData = data
      return res
    },
    setHeader: vi.fn(),
    write: (chunk: string) => chunks.push(chunk),
    end: vi.fn(),
  }
  return res
}

const testConfig = {
  port: 4000,
  agentApiKey: 'test-agent-key',
  jwtSecret: 'test-jwt-secret',
  extensionsPath: '/home/kamil/projects/ubek-next/extensions',
  nextJsUrl: 'http://localhost:3000',
  router: {
    url: 'http://localhost:18881/v1',
    apiKey: 'test-router-key',
    model: 'default',
  },
  db: {
    host: 'localhost',
    port: 5433,
    database: 'ubek_next',
    user: 'ubek',
    password: 'ubek',
  },
}

// Helper to extract POST handler from Express router
function getPostHandler(router: any): Function | null {
  const stack = router.stack || []
  for (const layer of stack) {
    if (layer.route?.path === '/chat/stream' && layer.route?.methods?.post) {
      return layer.route.stack[0]?.handle || null
    }
  }
  return null
}

describe('Chat Route Validation', () => {
  let pool: UserSessionPool
  let router: ReturnType<typeof createChatRouter>
  let handler: Function | null

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue(
      new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n'))
          controller.close()
        },
      }), { status: 200 }),
    )
    pool = new UserSessionPool()
    router = createChatRouter(pool, testConfig)
    handler = getPostHandler(router)
    ExtensionRegistry.reset()
    ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })
  })

  it('should reject empty message with 400', async () => {
    const res = mockResponse()
    await handler!({ body: { chatId: 'chat-1', message: '' }, userId: 'user-1' }, res)
    expect(res.statusCode).toBe(400)
    expect(res.jsonData.error).toContain('non-empty')
  })

  it('should reject message exceeding 10000 characters with 400', async () => {
    const res = mockResponse()
    await handler!({ body: { chatId: 'chat-1', message: 'x'.repeat(10001) }, userId: 'user-1' }, res)
    expect(res.statusCode).toBe(400)
  })

  it('should reject missing chatId with 400', async () => {
    const res = mockResponse()
    await handler!({ body: { message: 'hello' }, userId: 'user-1' }, res)
    expect(res.statusCode).toBe(400)
  })

  it('should set SSE headers on valid request', async () => {
    const res = mockResponse()
    await handler!({ body: { chatId: 'chat-1', message: 'Hello' }, userId: 'user-1' }, res)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache')
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive')
    expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no')
  })

  it('should return 429 when rate limit exceeded', async () => {
    const userId = `rate-user-${Date.now()}`
    let lastStatus = 200
    // Send 31 requests rapidly to exceed the 30/min limit
    for (let i = 0; i < 31; i++) {
      const r = mockResponse()
      await handler!({ body: { chatId: `chat-${i}`, message: `msg-${i}` }, userId }, r)
      lastStatus = r.statusCode
    }
    expect(lastStatus).toBe(429)
  })
})

describe('ExtensionRegistry Singleton', () => {
  beforeEach(() => {
    ExtensionRegistry.reset()
  })

  it('should throw when getInstance called without options first', () => {
    expect(() => ExtensionRegistry.getInstance()).toThrow('not initialized')
  })

  it('should return same instance on multiple calls', () => {
    const inst1 = ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })
    const inst2 = ExtensionRegistry.getInstance()
    expect(inst1).toBe(inst2)
  })

  it('should load core tools with correct names', async () => {
    const registry = ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })
    const tools = await registry.loadCoreTools()

    const names = tools.map((t) => t.name)
    expect(names).toContain('web_search')
    expect(names).toContain('vision')
    expect(names).toContain('document_gen')
    expect(names).toContain('memory')
  })

  it('should cache tools after first load', async () => {
    const registry = ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })

    const tools1 = await registry.loadCoreTools()
    const tools2 = await registry.loadCoreTools()
    expect(tools1).toBe(tools2)
  })

  it('should reset properly', () => {
    const inst1 = ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })
    ExtensionRegistry.reset()
    const inst2 = ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })
    expect(inst1).not.toBe(inst2)
  })
})
