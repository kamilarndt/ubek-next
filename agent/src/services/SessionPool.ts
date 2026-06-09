interface RuntimeOptions {
  routerUrl: string
  routerApiKey: string
  model: string
}

interface SessionEntry {
  runtime: unknown
  createdAt: number
  lastAccess: number
}

export interface AgentSessionRuntimeLike {
  switchSession: (file: string, options: unknown) => Promise<unknown>
}

export class UserSessionPool {
  private maxSize: number
  private accessOrder: string[] = []

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }
  private sessions = new Map<string, SessionEntry>()

  async getOrCreate(
    userId: string,
    options: RuntimeOptions,
  ): Promise<AgentSessionRuntimeLike> {
    const existing = this.sessions.get(userId)
    if (existing) {
      existing.lastAccess = Date.now()
      this.touch(userId)
      return existing.runtime as AgentSessionRuntimeLike
    }

    // LRU eviction if at capacity
    if (this.sessions.size >= this.maxSize) {
      const lru = this.accessOrder.shift()
      if (lru) this.sessions.delete(lru)
    }
    const runtime = this.createRuntime(options)
    this.sessions.set(userId, {
      runtime,
      createdAt: Date.now(),
      lastAccess: Date.now(),
    })
    this.accessOrder.push(userId)
    return runtime
  }

  has(userId: string): boolean {
    return this.sessions.has(userId)
  }

  async release(userId: string): Promise<void> {
    this.sessions.delete(userId)
    const idx = this.accessOrder.indexOf(userId)
    if (idx >= 0) this.accessOrder.splice(idx, 1)
  }

  async cleanup(maxIdleMs: number = 30 * 60 * 1000): Promise<number> {
    const now = Date.now()
    let cleaned = 0

    for (const [userId, entry] of this.sessions.entries()) {
      if (now - entry.lastAccess > maxIdleMs) {
        this.sessions.delete(userId)
        const idx = this.accessOrder.indexOf(userId)
        if (idx >= 0) this.accessOrder.splice(idx, 1)
        cleaned++
      }
    }

    return cleaned
  }

  setLastAccessForTest(userId: string, timestamp: number): void {
    const entry = this.sessions.get(userId)
    if (entry) {
      entry.lastAccess = timestamp
    }
  }

  private createRuntime(
    _options: RuntimeOptions,
  ): AgentSessionRuntimeLike {
    return {
      switchSession: async () => ({}),
    }
  }

  private touch(userId: string): void {
    const idx = this.accessOrder.indexOf(userId)
    if (idx >= 0) this.accessOrder.splice(idx, 1)
    this.accessOrder.push(userId)
  }
}
