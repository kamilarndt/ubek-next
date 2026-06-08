import express from 'express'
import cors from 'cors'
import { loadConfig } from './config'
import { healthRouter } from './routes/health'
import { createChatRouter } from './routes/chat'
import { createAuthMiddleware } from './middleware/auth'
import { UserSessionPool } from './services/SessionPool'

export async function createApp(): Promise<express.Application> {
  const config = loadConfig()
  const app = express()

  app.use(cors({ origin: false }))
  app.use(express.json())

  // Health endpoint (no auth)
  app.use('/api', healthRouter)

  const authMiddleware = createAuthMiddleware(
    config.jwtSecret,
    config.agentApiKey,
  )

  const pool = new UserSessionPool()
  const chatRouter = createChatRouter(pool, config)

  // Protected routes
  app.use('/api', authMiddleware, chatRouter)

  setInterval(() => {
    pool.cleanup(30 * 60 * 1000).catch(console.error)
  }, 5 * 60 * 1000)

  return app
}

if (require.main === module) {
  createApp().then((app) => {
    const config = loadConfig()
    app.listen(config.port, '127.0.0.1', () => {
      console.log(`[agent] Pi Agent listening on 127.0.0.1:${config.port}`)
    })
  })
}
