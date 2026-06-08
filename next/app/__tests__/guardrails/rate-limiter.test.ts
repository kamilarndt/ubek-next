import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRateLimiter, getUserKey } from '@/lib/guardrails/rate-limiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests within limit', () => {
    const limiter = createRateLimiter(3, 60000)
    const key = 'test:1'

    expect(limiter.check(key).allowed).toBe(true)
    expect(limiter.check(key).allowed).toBe(true)
    expect(limiter.check(key).allowed).toBe(true)
  })

  it('blocks requests over limit', () => {
    const limiter = createRateLimiter(3, 60000)
    const key = 'test:2'

    limiter.check(key)
    limiter.check(key)
    limiter.check(key)
    const fourth = limiter.check(key)

    expect(fourth.allowed).toBe(false)
    expect(fourth.remaining).toBe(0)
  })

  it('resets after window expires', () => {
    const limiter = createRateLimiter(2, 1000)
    const key = 'test:3'

    limiter.check(key)
    limiter.check(key)
    expect(limiter.check(key).allowed).toBe(false)

    vi.advanceTimersByTime(1001)

    const afterReset = limiter.check(key)
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.remaining).toBe(1)
  })

  it('reset() clears entry', () => {
    const limiter = createRateLimiter(1, 60000)
    const key = 'test:4'

    limiter.check(key)
    expect(limiter.check(key).allowed).toBe(false)

    limiter.reset(key)
    expect(limiter.check(key).allowed).toBe(true)
  })

  it('cleanup() removes expired entries', () => {
    const limiter = createRateLimiter(1, 1000)
    const key = 'test:5'

    limiter.check(key)
    vi.advanceTimersByTime(1001)
    limiter.cleanup()

    // After cleanup, should be allowed again (new window)
    expect(limiter.check(key).allowed).toBe(true)
  })

  it('returns remaining count', () => {
    const limiter = createRateLimiter(5, 60000)
    const key = 'test:6'

    const r1 = limiter.check(key)
    expect(r1.remaining).toBe(4)

    const r2 = limiter.check(key)
    expect(r2.remaining).toBe(3)
  })

  it('returns resetAt timestamp', () => {
    const limiter = createRateLimiter(1, 60000)
    const now = Date.now()
    vi.setSystemTime(now)

    const result = limiter.check('test:7')
    expect(result.resetAt).toBe(now + 60000)
  })
})

describe('getUserKey', () => {
  it('extracts from payload sub', () => {
    const headers = new Headers()
    const req = new Request('http://localhost', { headers })
    const key = getUserKey(req, { sub: 'user-abc' })
    expect(key).toBe('user:user-abc')
  })

  it('falls back to x-forwarded-for header', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4' })
    const req = new Request('http://localhost', { headers })
    const key = getUserKey(req)
    expect(key).toBe('ip:1.2.3.4')
  })

  it('falls back to x-real-ip when no x-forwarded-for', () => {
    const headers = new Headers({ 'x-real-ip': '5.6.7.8' })
    const req = new Request('http://localhost', { headers })
    const key = getUserKey(req)
    expect(key).toBe('ip:5.6.7.8')
  })

  it('falls back to unknown when no IP headers', () => {
    const req = new Request('http://localhost')
    const key = getUserKey(req)
    expect(key).toBe('ip:unknown')
  })
})
