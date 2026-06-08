import { describe, it, expect } from 'vitest'
import { createRouterProvider } from '../providers'

describe('Router LLM Provider', () => {
  it('should create provider config with correct URL', () => {
    const provider = createRouterProvider({
      url: 'http://localhost:18881/v1',
      apiKey: 'test-key',
      model: 'default',
    })

    expect(provider.name).toBe('router')
    expect(provider.baseUrl).toBe('http://localhost:18881/v1')
    expect(provider.apiKey).toBe('test-key')
    expect(provider.model).toBe('default')
  })

  it('should handle model override', () => {
    const provider = createRouterProvider({
      url: 'http://localhost:18881/v1',
      apiKey: 'test-key',
      model: 'claude-3-opus',
    })

    expect(provider.model).toBe('claude-3-opus')
  })
})
