import * as fs from 'fs/promises'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { ToolDefinition } from '../types'

interface RegistryOptions {
  extensionsPath: string
}

export class ExtensionRegistry {
  private resolvedBase: string

  constructor(private options: RegistryOptions) {
    this.resolvedBase = path.resolve(this.options.extensionsPath)
  }

  async loadCoreTools(): Promise<ToolDefinition[]> {
    const corePath = path.join(this.resolvedBase, 'core')

    let entries: fs.Dirent[]
    try {
      entries = await fs.readdir(corePath, { withFileTypes: true })
    } catch {
      return []
    }

    const tools: ToolDefinition[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const toolPath = path.resolve(corePath, entry.name, 'tool.ts')

      if (!toolPath.startsWith(this.resolvedBase)) {
        continue
      }

      let stat: fs.Stats | null = null
      try {
        stat = await fs.stat(toolPath)
      } catch {
        continue
      }
      if (!stat.isFile()) continue

      let mod: {
        name?: string
        description?: string
        schema?: { parse: (data: unknown) => unknown }
        execute?: (params: unknown) => Promise<{ content: { type: string; text: string }[] }>
      }
      try {
        mod = await import(toolPath)
      } catch {
        continue
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
          }
          required.push(...Object.keys(shape))
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
