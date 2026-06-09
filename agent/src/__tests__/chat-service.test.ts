import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callRouterLLM, parseSSEChunk, executeToolCalls } from '../services/chat-service'
import { ExtensionRegistry } from '../services/Registry'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

function mockStreamResponse(body: string): Response {
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

describe('callRouterLLM', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call router LLM with correct URL', async () => {
    mockFetch.mockResolvedValue(mockStreamResponse('data: {"text":"hello"}\n\n'))

    await callRouterLLM(testConfig, [{ role: 'user', content: 'hi' }], [])

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:18881/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-router-key',
        }),
      }),
    )
  })

  it('should include tools in body when provided', async () => {
    mockFetch.mockResolvedValue(mockStreamResponse('data: {}'))

    const tools = [
      {
        name: 'web_search',
        description: 'Search the web',
        parameters: { type: 'object' as const, properties: { q: { type: 'string' } }, required: ['q'] },
        execute: async () => ({ content: [{ type: 'text' as const, text: '' }] }),
      },
    ]

    await callRouterLLM(testConfig, [{ role: 'user', content: 'search' }], tools)

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.tools).toBeDefined()
    expect(callBody.tools[0].function.name).toBe('web_search')
  })

  it('should not include tools when tools array is empty', async () => {
    mockFetch.mockResolvedValue(mockStreamResponse('data: {}'))

    await callRouterLLM(testConfig, [{ role: 'user', content: 'hi' }], [])

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.tools).toBeUndefined()
  })

  it('should return a stream on success', async () => {
    mockFetch.mockResolvedValue(mockStreamResponse('data: {"text":"hello"}\n\n'))

    const result = await callRouterLLM(testConfig, [{ role: 'user', content: 'hi' }], [])

    expect(result.stream).toBeDefined()
    expect(result.stream).toBeInstanceOf(ReadableStream)
  })

  it('should include stream: true in request body', async () => {
    mockFetch.mockResolvedValue(mockStreamResponse('data: {}'))

    await callRouterLLM(testConfig, [{ role: 'user', content: 'hi' }], [])

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.stream).toBe(true)
  })
})

describe('parseSSEChunk', () => {
  it('should parse text from SSE data', () => {
    const result = parseSSEChunk('data: {"choices":[{"delta":{"content":"Hello"}}]}\n')
    expect(result.text).toBe('Hello')
    expect(result.toolCalls.size).toBe(0)
  })

  it('should accumulate text across multiple lines', () => {
    const result = parseSSEChunk(
      'data: {"choices":[{"delta":{"content":"Hello "}}]}\ndata: {"choices":[{"delta":{"content":"World"}}]}\n',
    )
    expect(result.text).toBe('Hello World')
  })

  it('should parse tool_calls from SSE data', () => {
    const sseData = JSON.stringify({
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            function: { name: 'web_search', arguments: '{"query":"test"}' },
          }],
        },
      }],
    })
    const result = parseSSEChunk(`data: ${sseData}\n`)
    expect(result.toolCalls.size).toBe(1)
    expect(result.toolCalls.get('0')?.name).toBe('web_search')
  })

  it('should accumulate tool call chunks from multiple lines', () => {
    const chunk1 = JSON.stringify({
      choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'web_' } }] } }],
    })
    const chunk2 = JSON.stringify({
      choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"q":"test"}' } }] } }],
    })
    const result = parseSSEChunk(`data: ${chunk1}\ndata: ${chunk2}\n`)
    expect(result.toolCalls.get('0')?.name).toBe('web_')
    expect(result.toolCalls.get('0')?.args).toBe('{"q":"test"}')
  })

  it('should skip [DONE] lines', () => {
    const result = parseSSEChunk('data: [DONE]\n')
    expect(result.text).toBe('')
    expect(result.toolCalls.size).toBe(0)
  })

  it('should skip non-data lines', () => {
    const result = parseSSEChunk('event: finish\ndata: {"choices":[{"delta":{"content":"ok"}}]}\n')
    expect(result.text).toBe('ok')
  })

  it('should handle malformed JSON gracefully', () => {
    const result = parseSSEChunk('data: {bad json}\n')
    expect(result.text).toBe('')
    expect(result.toolCalls.size).toBe(0)
  })

  it('should handle empty input', () => {
    const result = parseSSEChunk('')
    expect(result.text).toBe('')
    expect(result.toolCalls.size).toBe(0)
  })
})

describe('executeToolCalls', () => {
  beforeEach(() => {
    ExtensionRegistry.reset()
  })

  it('should execute a tool call and return result', async () => {
    // Initialize registry with real extensions path
    ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })

    const toolCalls = new Map<string, { name: string; args: string }>()
    toolCalls.set('0', {
      name: 'memory',
      args: JSON.stringify({ action: 'store', key: 'test', value: 'value123' }),
    })

    const registry = ExtensionRegistry.getInstance()
    const results = await executeToolCalls(toolCalls, registry, 'user-1')

    expect(results).toHaveLength(1)
    expect(results[0].role).toBe('tool')
    expect(results[0].content).toContain('Stored memory')
  })

  it('should pass userId context to tool execution', async () => {
    ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })

    const toolCalls = new Map<string, { name: string; args: string }>()
    toolCalls.set('0', {
      name: 'memory',
      args: JSON.stringify({ action: 'store', key: 'user_key', value: 'user_value' }),
    })

    const registry = ExtensionRegistry.getInstance()
    const results = await executeToolCalls(toolCalls, registry, 'user-42')

    expect(results[0].content).toContain('Stored memory')

    // Verify per-user isolation: different user doesn't see user-42's memory
    const toolCalls2 = new Map<string, { name: string; args: string }>()
    toolCalls2.set('0', {
      name: 'memory',
      args: JSON.stringify({ action: 'retrieve', key: 'user_key' }),
    })

    const results2 = await executeToolCalls(toolCalls2, registry, 'other-user')
    expect(results2[0].content).toContain('No memory found')
  })

  it('should return error for unknown tool', async () => {
    ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })

    const toolCalls = new Map<string, { name: string; args: string }>()
    toolCalls.set('0', { name: 'nonexistent_tool', args: '{}' })

    const registry = ExtensionRegistry.getInstance()
    const results = await executeToolCalls(toolCalls, registry, 'user-1')

    expect(results[0].content).toContain('not found')
  })

  it('should return error for invalid JSON arguments', async () => {
    ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })

    const toolCalls = new Map<string, { name: string; args: string }>()
    toolCalls.set('0', { name: 'memory', args: '{bad json}' })

    const registry = ExtensionRegistry.getInstance()
    const results = await executeToolCalls(toolCalls, registry, 'user-1')

    expect(results[0].content).toContain('invalid JSON')
  })

  it('should handle multiple tool calls', async () => {
    ExtensionRegistry.getInstance({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })

    const toolCalls = new Map<string, { name: string; args: string }>()
    toolCalls.set('0', {
      name: 'memory',
      args: JSON.stringify({ action: 'store', key: 'k1', value: 'v1' }),
    })
    toolCalls.set('1', {
      name: 'memory',
      args: JSON.stringify({ action: 'store', key: 'k2', value: 'v2' }),
    })

    const registry = ExtensionRegistry.getInstance()
    const results = await executeToolCalls(toolCalls, registry, 'user-1')

    expect(results).toHaveLength(2)
  })
})
