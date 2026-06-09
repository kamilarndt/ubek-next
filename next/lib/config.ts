/**
 * Centralized configuration for Next.js app.
 * Addresses scattered process.env reads (audit ID06 - DI & globals).
 * Callers should import { getConfig } and use typed values instead of direct process.env.
 * Validation happens at first load (fail fast in prod).
 */

export interface AppConfig {
  jwtSecret: string
  agentApiKey: string
  piAgentUrl: string
  routerUrl: string
  routerApiKey: string
  maxFileSize: number
  uploadDir: string
  nodeEnv: string
}

let _config: AppConfig | null = null

export function getConfig(): AppConfig {
  if (_config) return _config

  const jwtSecret = process.env.JWT_SECRET
  const agentApiKey = process.env.AGENT_API_KEY

  const missing: string[] = []
  if (!jwtSecret) missing.push('JWT_SECRET')
  if (!agentApiKey) missing.push('AGENT_API_KEY')

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  _config = {
    jwtSecret,
    agentApiKey,
    piAgentUrl: process.env.PI_AGENT_URL || 'http://localhost:4000',
    routerUrl: process.env.ROUTER_URL || 'http://localhost:18881/v1',
    routerApiKey: process.env.ROUTER_API_KEY || '',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10),
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    nodeEnv: process.env.NODE_ENV || 'development',
  }

  return _config
}

// For tests that need to reset between cases
export function resetConfigForTest() {
  _config = null
}
