export interface Config {
  port: number
  agentApiKey: string
  jwtSecret: string
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
  execute: (params: TParams) => Promise<{ content: { type: string; text: string }[] }>
}

export interface ChatRequest {
  chatId: string
  projectId: string
  message: string
  messages?: Array<{
    id: string
    role: 'user' | 'assistant' | 'tool'
    content: string
  }>
}

export interface ChatResponse {
  stream: ReadableStream
}
