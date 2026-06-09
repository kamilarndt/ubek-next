import * as documentGen from './core/document-gen/tool'
import * as memory from './core/memory/tool'
import * as vision from './core/vision/tool'
import * as webSearch from './core/web-search/tool'

export interface RegisteredTool {
  name: string
  description: string
  schema: { parse: (data: unknown) => unknown }
  execute: (params: unknown) => Promise<{ content: { type: string; text: string }[] }>
  category: string
}

export const coreTools: RegisteredTool[] = [
  { ...documentGen, category: 'core' },
  { ...memory, category: 'core' },
  { ...vision, category: 'core' },
  { ...webSearch, category: 'core' },
]
