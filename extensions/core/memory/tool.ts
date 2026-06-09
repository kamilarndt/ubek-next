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

const NEXTJS_URL = process.env.NEXTJS_URL || 'http://localhost:3000'

const memoryStores = new Map<string, Map<string, string>>()
const loadedUsers = new Set<string>()

async function getUserFactsApi(userId: string): Promise<{ key: string; value: string }[]> {
  try {
    const res = await fetch(`${NEXTJS_URL}/api/user-facts?userId=${encodeURIComponent(userId)}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

async function storeUserFactApi(userId: string, key: string, value: string): Promise<boolean> {
  try {
    const res = await fetch(`${NEXTJS_URL}/api/user-facts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, key, value }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function deleteUserFactApi(userId: string, key: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${NEXTJS_URL}/api/user-facts?userId=${encodeURIComponent(userId)}&key=${encodeURIComponent(key)}`,
      { method: 'DELETE' },
    )
    return res.ok
  } catch {
    return false
  }
}

async function getStore(userId: string): Promise<Map<string, string>> {
  if (!memoryStores.has(userId)) {
    memoryStores.set(userId, new Map())
  }
  const store = memoryStores.get(userId)!

  if (!loadedUsers.has(userId)) {
    const facts = await getUserFactsApi(userId)
    for (const fact of facts) {
      store.set(fact.key, fact.value)
    }
    loadedUsers.add(userId)
  }

  return store
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
      await storeUserFactApi(userId, key, value)
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
        await deleteUserFactApi(userId, key)
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
