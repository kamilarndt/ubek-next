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

      tools.push({
        name: entry.name.replace(/-/g, '_'),
        description: `Core tool: ${entry.name}`,
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
        execute: async () => ({
          content: [{ type: 'text', text: `${entry.name} tool executed` }],
        }),
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
