import { describe, it, expect, beforeEach } from 'vitest'
import { UserSessionPool } from '../services/SessionPool'

describe('UserSessionPool', () => {
  let pool: UserSessionPool

  beforeEach(() => {
    pool = new UserSessionPool()
  })

  it('should create a runtime for a new user', async () => {
    const runtime = await pool.getOrCreate('user-1', {
      routerUrl: 'http://localhost:18881/v1',
      routerApiKey: 'test-key',
      model: 'default',
    })

    expect(runtime).toBeDefined()
  })

  it('should return the same runtime for the same user', async () => {
    const runtime1 = await pool.getOrCreate('user-1', {
      routerUrl: 'http://localhost:18881/v1',
      routerApiKey: 'test-key',
      model: 'default',
    })
    const runtime2 = await pool.getOrCreate('user-1', {
      routerUrl: 'http://localhost:18881/v1',
      routerApiKey: 'test-key',
      model: 'default',
    })

    expect(runtime1).toBe(runtime2)
  })

  it('should return different runtimes for different users', async () => {
    const runtime1 = await pool.getOrCreate('user-1', {
      routerUrl: 'http://localhost:18881/v1',
      routerApiKey: 'test-key',
      model: 'default',
    })
    const runtime2 = await pool.getOrCreate('user-2', {
      routerUrl: 'http://localhost:18881/v1',
      routerApiKey: 'test-key',
      model: 'default',
    })

    expect(runtime1).not.toBe(runtime2)
  })

  it('should remove runtime on release', async () => {
    await pool.getOrCreate('user-1', {
      routerUrl: 'http://localhost:18881/v1',
      routerApiKey: 'test-key',
      model: 'default',
    })

    await pool.release('user-1')
    const exists = pool.has('user-1')
    expect(exists).toBe(false)
  })

  it('should cleanup idle sessions', async () => {
    await pool.getOrCreate('user-1', {
      routerUrl: 'http://localhost:18881/v1',
      routerApiKey: 'test-key',
      model: 'default',
    })

    pool.setLastAccessForTest('user-1', Date.now() - 31 * 60 * 1000)

    const cleaned = await pool.cleanup(30 * 60 * 1000)
    expect(cleaned).toBe(1)
    expect(pool.has('user-1')).toBe(false)
  })
})
