import * as fs from 'fs'
import * as path from 'path'
import type { ToolDefinition } from '../types'

interface RegistryOptions {
  extensionsPath: string
}

export class ExtensionRegistry {
  constructor(private options: RegistryOptions) {}

  async loadCoreTools(): Promise<ToolDefinition[]> {
    const corePath = path.join(this.options.extensionsPath, 'core')

    if (!fs.existsSync(corePath)) {
      return []
    }

    const entries = fs.readdirSync(corePath, { withFileTypes: true })
    const tools: ToolDefinition[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const toolPath = path.join(corePath, entry.name, 'tool.ts')
      if (!fs.existsSync(toolPath)) continue

      const mod = await import(toolPath) as {
        name?: string
        description?: string
        schema?: { parse: (data: unknown) => unknown }
        execute?: (params: unknown) => Promise<{ content: { type: string; text: string }[] }>
      }

      const schema = mod.schema
      const properties: Record<string, unknown> = {}
      const required: string[] = []

      if (schema) {
        const shape = (schema as unknown as { _def?: { shape?: Record<string, unknown> } })._def?.shape
        if (shape) {
          for (const [key, field] of Object.entries(shape)) {
            const zodField = field as { _def?: { typeName?: string; description?: string } }
            properties[key] = {
              type: 'string',
              description: zodField._def?.description || key,
            }
            if (key === 'query' || key === 'action' || key === 'title' || key === 'content') {
              required.push(key)
            }
          }
        }
      }

      tools.push({
        name: mod.name || entry.name.replace(/-/g, '_'),
        description: mod.description || `Core tool: ${entry.name}`,
        parameters: {
          type: 'object',
          properties,
          required,
        },
        execute: async (params: unknown) => {
          if (mod.execute) {
            return mod.execute(params)
          }
          return { content: [{ type: 'text', text: `${entry.name} tool executed` }] }
        },
      })
    }

    return tools
  }

  async getToolsForProject(
    _projectId: string,
    _extensionNames: string[],
  ): Promise<ToolDefinition[]> {
    return this.loadCoreTools()
  }
}
