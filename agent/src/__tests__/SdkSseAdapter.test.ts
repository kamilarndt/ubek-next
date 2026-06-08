import { describe, it, expect, vi } from 'vitest'
import { SdkSseAdapter } from '../services/SdkSseAdapter'

describe('SdkSseAdapter', () => {
  it('should handle text events from Pi SDK', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({
      type: 'text',
      data: { text: 'Hello' },
    })

    expect(write).toHaveBeenCalledTimes(2)
    // First call: start, second call: text-delta
    const textDeltaCall = write.mock.calls[1][0] as string
    expect(textDeltaCall).toContain('text-delta')
    expect(textDeltaCall).toContain('Hello')
  })

  it('should send text-start on first text event', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({
      type: 'text',
      data: { text: 'Hello' },
    })

    expect(write.mock.calls[0][0]).toContain('"type":"start"')
    expect(write.mock.calls[1][0]).toContain('"type":"text-delta"')
  })

  it('should send text-end on non-text event after text', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({ type: 'text', data: { text: 'Hello' } })
    adapter.handleEvent({ type: 'tool_call', data: {} })

    expect(write.mock.calls[2][0]).toContain('"type":"text-end"')
  })

  it('should handle tool_call events', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({ type: 'text', data: { text: 'Let me search' } })
    adapter.handleEvent({
      type: 'tool_call',
      data: {
        tool_name: 'web_search',
        input: { query: 'test' },
      },
    })

    const calls = write.mock.calls.map((c) => c[0] as string)
    const toolInputCall = calls.find((c) => c.includes('tool-input-available'))
    expect(toolInputCall).toBeDefined()
    expect(toolInputCall).toContain('web_search')
  })

  it('should handle tool_result events', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({
      type: 'tool_result',
      data: {
        tool_name: 'web_search',
        output: { results: [] },
      },
    })

    const calls = write.mock.calls.map((c) => c[0] as string)
    const toolOutputCall = calls.find((c) => c.includes('tool-output-available'))
    expect(toolOutputCall).toBeDefined()
    expect(toolOutputCall).toContain('web_search')
  })

  it('should handle reasoning events', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({
      type: 'reasoning',
      data: { content: 'thinking...' },
    })

    const calls = write.mock.calls.map((c) => c[0] as string)
    const reasoningCall = calls.find((c) => c.includes('reasoning-delta'))
    expect(reasoningCall).toBeDefined()
    expect(reasoningCall).toContain('thinking...')
  })

  it('should send finish + [DONE] + end on finish event', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({
      type: 'finish',
      data: { finish_reason: 'stop' },
    })

    // First call is start, second is finish
    expect(write.mock.calls[1][0]).toContain('"type":"finish"')
    expect(write.mock.calls[2][0]).toContain('[DONE]')
    expect(end).toHaveBeenCalled()
  })

  it('should send reasoning-end before finish if reasoning was sent', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({ type: 'reasoning', data: { content: 'thinking' } })
    adapter.handleEvent({ type: 'finish', data: { finish_reason: 'stop' } })

    const calls = write.mock.calls.map((c) => c[0] as string)
    const reasoningEndIdx = calls.findIndex((c) => c.includes('reasoning-end'))
    const finishIdx = calls.findIndex((c) => c.includes('"type":"finish"'))
    expect(reasoningEndIdx).toBeLessThan(finishIdx)
  })

  it('should handle error events', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({
      type: 'error',
      data: { message: 'API key invalid' },
    })

    // First call is start, second is error
    expect(write.mock.calls[1][0]).toContain('"type":"error"')
    expect(write.mock.calls[1][0]).toContain('API key invalid')
  })

  it('should ignore unknown event types', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({
      type: 'unknown_event',
      data: {},
    })

    expect(write).not.toHaveBeenCalled()
  })

  it('should close open text block on finish', () => {
    const write = vi.fn()
    const end = vi.fn()
    const adapter = new SdkSseAdapter(write, end, 'msg-1')

    adapter.handleEvent({ type: 'text', data: { text: 'Hello' } })
    adapter.handleEvent({ type: 'finish', data: { finish_reason: 'stop' } })

    const calls = write.mock.calls.map((c) => c[0] as string)
    const textEndIdx = calls.findIndex((c) => c.includes('text-end'))
    const finishIdx = calls.findIndex((c) => c.includes('"type":"finish"'))
    expect(textEndIdx).toBeLessThan(finishIdx)
  })
})
