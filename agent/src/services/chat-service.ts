import { ExtensionRegistry } from './Registry'
import type { Config } from '../types'

interface ToolCall {
  id: string
  function: { name: string; arguments: string }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

function toOpenAITools(registryTools: Awaited<ReturnType<ExtensionRegistry['loadCoreTools']>>) {
  return registryTools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

export async function callRouterLLM(
  config: Config,
  messages: ChatMessage[],
  tools: Awaited<ReturnType<ExtensionRegistry['loadCoreTools']>>,
  signal?: AbortSignal,
): Promise<{ stream: ReadableStream<Uint8Array> | null; response: Response }> {
  const routerUrl = config.router.url.replace(/\/+$/, '')
  const body: Record<string, unknown> = {
    model: config.router.model || 'auto',
    messages,
    stream: true,
  }

  if (tools.length > 0) {
    body.tools = toOpenAITools(tools)
  }

  const response = await fetch(`${routerUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.router.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  return { stream: response.body, response }
}

export function parseSSEChunk(buffer: string): { text: string; toolCalls: Map<string, { name: string; args: string }> } {
  let text = ''
  const toolCalls = new Map<string, { name: string; args: string }>()

  for (const line of buffer.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('data: ')) continue
    const jsonData = trimmed.slice(6)
    if (jsonData === '[DONE]') continue

    try {
      const parsed = JSON.parse(jsonData)
      const delta = parsed.choices?.[0]?.delta
      if (!delta) continue

      if (delta.content) {
        text += delta.content
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const index = tc.index ?? 0
          if (!toolCalls.has(String(index))) {
            toolCalls.set(String(index), { name: '', args: '' })
          }
          const existing = toolCalls.get(String(index))!
          if (tc.function?.name) existing.name += tc.function.name
          if (tc.function?.arguments) existing.args += tc.function.arguments
        }
      }
    } catch {
      // skip malformed JSON
    }
  }

  return { text, toolCalls }
}

export async function executeToolCalls(
  toolCalls: Map<string, { name: string; args: string }>,
  registry: ExtensionRegistry,
): Promise<ChatMessage[]> {
  const tools = await registry.loadCoreTools()
  const results: ChatMessage[] = []

  for (const [, tc] of toolCalls) {
    const tool = tools.find((t) => t.name === tc.name)
    if (!tool) {
      results.push({
        role: 'tool',
        tool_call_id: tc.name,
        content: `Error: tool "${tc.name}" not found`,
      })
      continue
    }

    let parsedArgs: unknown
    try {
      parsedArgs = JSON.parse(tc.args)
    } catch {
      results.push({
        role: 'tool',
        tool_call_id: tc.name,
        content: `Error: invalid JSON arguments: ${tc.args}`,
      })
      continue
    }

    try {
      const result = await tool.execute(parsedArgs)
      results.push({
        role: 'tool',
        tool_call_id: tc.name,
        content: result.content[0]?.text || 'Tool executed',
      })
    } catch (err) {
      results.push({
        role: 'tool',
        tool_call_id: tc.name,
        content: `Error executing ${tc.name}: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  return results
}
