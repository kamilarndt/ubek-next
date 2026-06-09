import { z } from 'zod'

export const name = 'memory'

export const description = 'Store and retrieve information from the user\'s long-term memory. Memories are key-value pairs that persist across conversations.'

const actionSchema = z.enum(['store', 'retrieve', 'list', 'delete'])

export const schema = z.object({
  action: actionSchema.describe('The memory action to perform'),
  key: z.string().min(1).describe('The memory key (used for store, retrieve, delete)'),
  value: z.string().optional().describe('The value to store (only for store action)'),
})

export type Params = z.infer<typeof schema>

const memoryStore = new Map<string, string>()

export async function execute(_params: Params): Promise<{ content: { type: string; text: string }[] }> {
  const params = schema.parse(_params)
  const { action, key, value } = params

  switch (action) {
    case 'store': {
      if (!value) {
        return { content: [{ type: 'text', text: 'Error: value is required for store action.' }] }
      }
      memoryStore.set(key, value)
      return { content: [{ type: 'text', text: `Stored memory: "${key}"` }] }
    }

    case 'retrieve': {
      const stored = memoryStore.get(key)
      if (!stored) {
        return { content: [{ type: 'text', text: `No memory found for key: "${key}"` }] }
      }
      return { content: [{ type: 'text', text: `${key}: ${stored}` }] }
    }

    case 'list': {
      const keys = Array.from(memoryStore.keys())
      if (keys.length === 0) {
        return { content: [{ type: 'text', text: 'No memories stored.' }] }
      }
      return { content: [{ type: 'text', text: `Stored memories:\n${keys.join('\n')}` }] }
    }

    case 'delete': {
      const existed = memoryStore.has(key)
      memoryStore.delete(key)
      return {
        content: [{ type: 'text', text: existed ? `Deleted memory: "${key}"` : `No memory found for key: "${key}"` }],
      }
    }

    default: {
      return { content: [{ type: 'text', text: `Unknown action: ${action}` }] }
    }
  }
}
