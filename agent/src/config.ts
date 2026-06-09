import { type Config } from './types'

export function loadConfig(): Config {
  const required = ['JWT_SECRET', 'AGENT_API_KEY', 'ROUTER_URL', 'ROUTER_API_KEY']

  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  return {
    port: parseInt(process.env.PORT || '4000', 10),
    agentApiKey: process.env.AGENT_API_KEY!,
    jwtSecret: process.env.JWT_SECRET!,
    extensionsPath: process.env.EXTENSIONS_PATH || './extensions',
    router: {
      url: process.env.ROUTER_URL!,
      apiKey: process.env.ROUTER_API_KEY!,
      model: process.env.MODEL || 'default',
    },
    db: {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5433', 10),
      database: process.env.PGDATABASE || 'ubek_next',
      user: process.env.PGUSER || 'ubek',
      password: process.env.PGPASSWORD || 'ubek',
    },
  }
}
