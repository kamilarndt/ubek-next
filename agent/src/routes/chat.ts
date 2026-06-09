import { Router, type Request, type Response } from 'express'
import { SdkSseAdapter } from '../services/SdkSseAdapter'
import { UserSessionPool } from '../services/SessionPool'
import { ExtensionRegistry } from '../services/Registry'
import { callRouterLLM, parseSSEChunk, executeToolCalls } from '../services/chat-service'
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

async function doStreamingCall(
  config: Config,
  messages: Array<{ role: string; content: string }>,
  registry: ExtensionRegistry,
  write: (chunk: string) => void,
): Promise<void> {
  const tools = await registry.loadCoreTools()
  const { stream } = await callRouterLLM(config, messages as any, tools)

  if (!stream) {
    write(JSON.stringify({ type: 'error', data: { message: 'No response stream' } }))
    return
  }

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let collectedText = ''
  let collectedToolCalls = new Map<string, { name: string; args: string }>()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    const chunk = lines.join('\n')

    const { text, toolCalls } = parseSSEChunk(chunk)
    if (text) {
      collectedText += text
    }
    if (toolCalls.size > 0) {
      collectedToolCalls = new Map([...collectedToolCalls, ...toolCalls])
    }

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
        write(trimmed + '\n\n')
      }
    }
  }

  if (collectedToolCalls.size > 0) {
    const toolResults = await executeToolCalls(collectedToolCalls, registry)

    const messagesWithTools = [
      ...messages,
      { role: 'assistant' as const, content: collectedText || null },
      ...toolResults,
    ]

    const { stream: resultStream } = await callRouterLLM(config, messagesWithTools as any, tools)
    if (!resultStream) return

    const resultReader = resultStream.getReader()
    const resultDecoder = new TextDecoder()
    let resultBuffer = ''

    while (true) {
      const { done, value } = await resultReader.read()
      if (done) break
      resultBuffer += resultDecoder.decode(value, { stream: true })
      const lines = resultBuffer.split('\n')
      resultBuffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          write(trimmed + '\n\n')
        }
      }
    }
  }
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

      const registry = new ExtensionRegistry({ extensionsPath: config.extensionsPath || 'extensions' })
      const messages = [{ role: 'user', content: message }]

      adapter.handleEvent({ type: 'start', data: { chatId } })
      await doStreamingCall(config, messages, registry, write)
      adapter.handleEvent({ type: 'finish', data: { finish_reason: 'stop' } })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      adapter.handleEvent({ type: 'error', data: { message: errorMessage } })
    }
  })

  return router
}
