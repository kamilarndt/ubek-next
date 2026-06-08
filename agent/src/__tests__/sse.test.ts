import { describe, it, expect } from 'vitest'
import {
  sendAISDKStart,
  sendAISDKTextDelta,
  sendAISDKTextEnd,
  sendAISDKReasoningDelta,
  sendAISDKReasoningEnd,
  sendAISDKToolInput,
  sendAISDKToolOutput,
  sendAISDKFinish,
  sendAISDKError,
} from '../utils/sse'

describe('SSE Protocol Helpers', () => {
  it('should send start event', () => {
    const chunks: string[] = []
    const write = (chunk: string) => chunks.push(chunk)

    sendAISDKStart(write, 'msg-1')

    expect(chunks[0]).toContain('data: {"type":"start"')
    expect(chunks[0]).toContain('"messageId":"msg-1"')
  })

  it('should send text-delta event', () => {
    const chunks: string[] = []
    const write = (chunk: string) => chunks.push(chunk)

    sendAISDKTextDelta(write, 'Hello')

    expect(chunks[0]).toContain('data: {"type":"text-delta"')
    expect(chunks[0]).toContain('"text":"Hello"')
  })

  it('should send text-end event', () => {
    const chunks: string[] = []
    const write = (chunk: string) => chunks.push(chunk)

    sendAISDKTextEnd(write)

    expect(chunks[0]).toContain('data: {"type":"text-end"')
  })

  it('should send reasoning-delta event', () => {
    const chunks: string[] = []
    const write = (chunk: string) => chunks.push(chunk)

    sendAISDKReasoningDelta(write, 'thinking...')

    expect(chunks[0]).toContain('data: {"type":"reasoning-delta"')
    expect(chunks[0]).toContain('"content":"thinking..."')
  })

  it('should send reasoning-end event', () => {
    const chunks: string[] = []
    const write = (chunk: string) => chunks.push(chunk)

    sendAISDKReasoningEnd(write)

    expect(chunks[0]).toContain('data: {"type":"reasoning-end"')
  })

  it('should send tool-input-available event', () => {
    const chunks: string[] = []
    const write = (chunk: string) => chunks.push(chunk)

    sendAISDKToolInput(write, 'search', { query: 'test' })

    expect(chunks[0]).toContain('data: {"type":"tool-input-available"')
    expect(chunks[0]).toContain('"toolName":"search"')
  })

  it('should send tool-output-available event', () => {
    const chunks: string[] = []
    const write = (chunk: string) => chunks.push(chunk)

    sendAISDKToolOutput(write, 'search', { results: [] })

    expect(chunks[0]).toContain('data: {"type":"tool-output-available"')
    expect(chunks[0]).toContain('"toolName":"search"')
  })

  it('should send finish event with [DONE]', () => {
    const chunks: string[] = []
    const write = (chunk: string) => chunks.push(chunk)
    const end = () => chunks.push('[END]')

    sendAISDKFinish(write, end, 'stop')

    expect(chunks[0]).toContain('data: {"type":"finish"')
    expect(chunks[0]).toContain('"finishReason":"stop"')
    expect(chunks[1]).toContain('data: [DONE]')
    expect(chunks[2]).toBe('[END]')
  })

  it('should send error event', () => {
    const chunks: string[] = []
    const write = (chunk: string) => chunks.push(chunk)

    sendAISDKError(write, 'Something went wrong')

    expect(chunks[0]).toContain('data: {"type":"error"')
    expect(chunks[0]).toContain('"error":"Something went wrong"')
  })
})
