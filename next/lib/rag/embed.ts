import { getConfig } from '@/lib/config'

const cfg = getConfig()
const ROUTER_URL = cfg.routerUrl
const ROUTER_API_KEY = cfg.routerApiKey

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${ROUTER_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  })

  if (!res.ok) {
    throw new Error(`Embedding API error: ${res.status}`)
  }

  const data = await res.json()
  return data.data[0].embedding
}
