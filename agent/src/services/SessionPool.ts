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
  private sessions = new Map<string, SessionEntry>()

  async getOrCreate(
    userId: string,
    options: RuntimeOptions,
  ): Promise<AgentSessionRuntimeLike> {
    const existing = this.sessions.get(userId)
    if (existing) {
      existing.lastAccess = Date.now()
      return existing.runtime as AgentSessionRuntimeLike
    }

    const runtime = this.createRuntime(options)
    this.sessions.set(userId, {
      runtime,
      createdAt: Date.now(),
      lastAccess: Date.now(),
    })
    return runtime
  }

  has(userId: string): boolean {
    return this.sessions.has(userId)
  }

  async release(userId: string): Promise<void> {
    this.sessions.delete(userId)
  }

  async cleanup(maxIdleMs: number = 30 * 60 * 1000): Promise<number> {
    const now = Date.now()
    let cleaned = 0

    for (const [userId, entry] of this.sessions.entries()) {
      if (now - entry.lastAccess > maxIdleMs) {
        this.sessions.delete(userId)
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
}
