import { Router, type Request, type Response } from 'express'
import { SdkSseAdapter } from '../services/SdkSseAdapter'
import { UserSessionPool } from '../services/SessionPool'
import type { Config } from '../types'

export function createChatRouter(
  pool: UserSessionPool,
  config: Config,
): Router {
  const router = Router()

  router.post('/chat/stream', async (req: Request, res: Response) => {
    const userId = (req as any).userId
    const { chatId, projectId, message } = req.body

    if (!chatId || !message) {
      res.status(400).json({ error: 'Missing chatId or message' })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const write = (chunk: string) => res.write(chunk)
    const end = () => res.end()
    const adapter = new SdkSseAdapter(write, end, chatId)

    try {
      await pool.getOrCreate(userId, {
        routerUrl: config.router.url,
        routerApiKey: config.router.apiKey,
        model: config.router.model,
      })

      adapter.handleEvent({ type: 'text', data: { text: `Echo: ${message}` } })
      adapter.handleEvent({ type: 'finish', data: { finish_reason: 'stop' } })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      adapter.handleEvent({ type: 'error', data: { message: errorMessage } })
    }
  })

  return router
}
