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

import { userFactStore } from '@/lib/store'

// In-memory cache per user
const memoryStores = new Map<string, Map<string, string>>()
const loadedUsers = new Set<string>()

async function loadUserFacts(userId: string): Promise<void> {
  const facts = await userFactStore.findByUserId(userId)
  const store = memoryStores.get(userId)!
  for (const fact of facts) {
    // value stored as JSONB, stringify for consistency
    store.set(fact.key, JSON.stringify(fact.value))
  }
  loadedUsers.add(userId)
}

async function getStore(userId: string): Promise<Map<string, string>> {
  if (!memoryStores.has(userId)) {
    memoryStores.set(userId, new Map())
  }
  const store = memoryStores.get(userId)!
  if (!loadedUsers.has(userId)) {
    await loadUserFacts(userId)
  }
  return store
}

async function persistFact(userId: string, key: string, value: string): Promise<void> {
  // Upsert logic: try to find existing, delete then insert
  const existing = await userFactStore.findByKey(userId, key)
  if (existing) {
    await userFactStore.delete(existing.id)
  }
  await userFactStore.create({ userId, key, value })
}

async function deleteFact(userId: string, key: string): Promise<void> {
  const existing = await userFactStore.findByKey(userId, key)
  if (existing) {
    await userFactStore.delete(existing.id)
  }
}

export async function execute(
  _params: Params,
  context?: { userId?: string },
): Promise<{ content: { type: string; text: string }[] }> {
  const params = schema.parse(_params)
  const { action, key, value } = params
  const userId = context?.userId || 'default'
  const store = await getStore(userId)

  switch (action) {
    case 'store': {
      if (!value) {
        return { content: [{ type: 'text', text: 'Error: value is required for store action.' }] }
      }
      store.set(key, value)
      await persistFact(userId, key, value)
      return { content: [{ type: 'text', text: `Stored memory: "${key}"` }] }
    }

    case 'retrieve': {
      const stored = store.get(key)
      if (!stored) {
        return { content: [{ type: 'text', text: `No memory found for key: "${key}"` }] }
      }
      return { content: [{ type: 'text', text: `${key}: ${stored}` }] }
    }

    case 'list': {
      const keys = Array.from(store.keys())
      if (keys.length === 0) {
        return { content: [{ type: 'text', text: 'No memories stored.' }] }
      }
      return { content: [{ type: 'text', text: `Stored memories:\n${keys.join('\n')}` }] }
    }

    case 'delete': {
      const existed = store.has(key)
      store.delete(key)
      if (existed) {
        await deleteFact(userId, key)
      }
      return {
        content: [{ type: 'text', text: existed ? `Deleted memory: "${key}"` : `No memory found for key: "${key}"` }],
      }
    }

    default: {
      return { content: [{ type: 'text', text: `Unknown action: ${action}` }] }
    }
  }
}
