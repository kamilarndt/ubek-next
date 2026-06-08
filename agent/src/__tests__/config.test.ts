import { describe, it, expect } from 'vitest'
import { loadConfig } from '../config'

describe('Config', () => {
  it('should load config from environment variables', () => {
    process.env.PORT = '4000'
    process.env.AGENT_API_KEY = 'test-api-key'
    process.env.JWT_SECRET = 'test-jwt-secret'
    process.env.ROUTER_URL = 'http://localhost:18881/v1'
    process.env.ROUTER_API_KEY = 'test-router-key'
    process.env.PGHOST = 'localhost'
    process.env.PGPORT = '5433'
    process.env.PGDATABASE = 'ubek_next'
    process.env.PGUSER = 'ubek'
    process.env.PGPASSWORD = 'ubek'

    const config = loadConfig()

    expect(config.port).toBe(4000)
    expect(config.agentApiKey).toBe('test-api-key')
    expect(config.jwtSecret).toBe('test-jwt-secret')
    expect(config.router.url).toBe('http://localhost:18881/v1')
    expect(config.router.apiKey).toBe('test-router-key')
    expect(config.db.host).toBe('localhost')
    expect(config.db.port).toBe(5433)
    expect(config.db.database).toBe('ubek_next')
    expect(config.db.user).toBe('ubek')
    expect(config.db.password).toBe('ubek')
  })

  it('should throw on missing required config', () => {
    delete process.env.JWT_SECRET
    expect(() => {
      loadConfig()
    }).toThrow()
  })
})
