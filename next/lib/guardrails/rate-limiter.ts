import { TokenPayload } from '@/lib/auth'

export interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return {
    check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
      const now = Date.now()
      const entry = store.get(key)

      if (!entry || now >= entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
      }

      if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt }
      }

      entry.count++
      return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
    },

    reset(key: string): void {
      store.delete(key)
    },

    cleanup(): void {
      const now = Date.now()
      for (const [key, entry] of store) {
        if (now >= entry.resetAt) {
          store.delete(key)
        }
      }
    },
  }
}

export function getUserKey(req: Request, payload?: TokenPayload): string {
  if (payload?.sub) return `user:${payload.sub}`
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  return `ip:${ip}`
}
