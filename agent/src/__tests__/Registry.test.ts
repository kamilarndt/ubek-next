import { describe, it, expect } from 'vitest'
import { ExtensionRegistry } from '../services/Registry'

describe('ExtensionRegistry', () => {
  it('should load core tools from extensions path', async () => {
    const registry = new ExtensionRegistry({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })

    const tools = await registry.loadCoreTools()

    expect(Array.isArray(tools)).toBe(true)
  })

  it('should return empty array if extensions path does not exist', async () => {
    const registry = new ExtensionRegistry({
      extensionsPath: '/nonexistent/path',
    })

    const tools = await registry.loadCoreTools()

    expect(tools).toEqual([])
  })

  it('should filter tool definitions by project', async () => {
    const registry = new ExtensionRegistry({
      extensionsPath: '/home/kamil/projects/ubek-next/extensions',
    })

    const tools = await registry.getToolsForProject('project-1', [
      'web-search',
      'vision',
    ])

    expect(Array.isArray(tools)).toBe(true)
  })
})
