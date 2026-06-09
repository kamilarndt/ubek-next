export interface Config {
  port: number
  agentApiKey: string
  jwtSecret: string
  extensionsPath: string
  defaultSystemPrompt?: string
  nextJsUrl: string
  router: {
    url: string
    apiKey: string
    model: string
  }
  db: {
    host: string
    port: number
    database: string
    user: string
    password: string
  }
}

export interface ToolDefinition<TParams = unknown> {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  execute: (params: TParams, context?: { userId?: string }) => Promise<{ content: { type: string; text: string }[] }>
}

export interface ChatRequest {
  chatId: string
  projectId: string
  message: string
  systemPrompt?: string
  messages?: Array<{
    id: string
    role: 'user' | 'assistant' | 'tool'
    content: string
  }>
}

export interface ChatResponse {
  stream: ReadableStream
}
