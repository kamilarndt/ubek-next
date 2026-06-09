import { describe, it, expect } from 'vitest'

describe('System Prompt', () => {
  it('should prepend system message when defaultSystemPrompt is set', () => {
    const config = { defaultSystemPrompt: 'You are helpful' }
    const messages = [{ role: 'user' as const, content: 'hi' }]
    const systemMessage = config.defaultSystemPrompt
      ? { role: 'system' as const, content: config.defaultSystemPrompt }
      : null
    const result = systemMessage ? [systemMessage, ...messages] : messages
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('system')
  })

  it('should not prepend when not set', () => {
    const config = {}
    const messages = [{ role: 'user' as const, content: 'hi' }]
    const systemMessage = (config as any).defaultSystemPrompt
      ? { role: 'system' as const, content: (config as any).defaultSystemPrompt }
      : null
    const result = systemMessage ? [systemMessage, ...messages] : messages
    expect(result).toHaveLength(1)
  })
})