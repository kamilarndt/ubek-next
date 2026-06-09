import { Router, type Request, type Response } from 'express'
import { SdkSseAdapter } from '../services/SdkSseAdapter'
import { UserSessionPool } from '../services/SessionPool'
import type { Config } from '../types'

function validateMessage(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('message must be a non-empty string')
  }
  if (value.length > 10000) {
    throw new Error('message exceeds maximum length')
  }
  return value
}

function validateChatId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('chatId must be a non-empty string')
  }
  return value
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string, maxPerMinute = 30): void {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 })
    return
  }
  if (entry.count >= maxPerMinute) {
    throw new Error('Rate limit exceeded. Try again later.')
  }
  entry.count++
}

export function createChatRouter(
  pool: UserSessionPool,
  config: Config,
): Router {
  const router = Router()

  router.post('/chat/stream', async (req: Request, res: Response) => {
    const userId = (req as any).userId

    try {
      checkRateLimit(userId)
    } catch {
      res.status(429).json({ error: 'Rate limit exceeded. Try again later.' })
      return
    }

    let chatId: string
    let message: string
    try {
      chatId = validateChatId(req.body.chatId)
      message = validateMessage(req.body.message)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid request' })
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

      const routerUrl = config.router.url.replace(/\/+$/, '')
      const routerResponse = await fetch(`${routerUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.router.apiKey}`,
        },
        body: JSON.stringify({
          model: config.router.model || 'auto',
          messages: [{ role: 'user', content: message }],
          stream: true,
        }),
      })

      if (!routerResponse.ok) {
        adapter.handleEvent({
          type: 'error',
          data: { message: `Router LLM error: ${routerResponse.status}` },
        })
        adapter.handleEvent({ type: 'finish', data: { finish_reason: 'error' } })
        return
      }

      const reader = routerResponse.body?.getReader()
      if (!reader) {
        adapter.handleEvent({ type: 'error', data: { message: 'No response body from Router LLM' } })
        adapter.handleEvent({ type: 'finish', data: { finish_reason: 'error' } })
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let hasContent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const jsonData = trimmed.slice(6)
          if (jsonData === '[DONE]') continue

          try {
            const parsed = JSON.parse(jsonData)
            const text = parsed.choices?.[0]?.delta?.content || ''
            if (text) {
              hasContent = true
              adapter.handleEvent({ type: 'text', data: { text } })
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      }

      if (!hasContent) {
        adapter.handleEvent({
          type: 'text',
          data: { text: 'I received your message but could not generate a response. Please try again.' },
        })
      }

      adapter.handleEvent({ type: 'finish', data: { finish_reason: 'stop' } })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      adapter.handleEvent({ type: 'error', data: { message: errorMessage } })
    }
  })

  return router
}
