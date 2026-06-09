import { z } from 'zod'

export const name = 'web_search'

export const description = 'Search the web for current information. Returns a list of relevant results with snippets and URLs.'

export const schema = z.object({
  query: z.string().min(1).describe('The search query'),
  maxResults: z.number().int().min(1).max(20).default(5).describe('Maximum number of results to return'),
})

export type Params = z.infer<typeof schema>

export async function execute(params: Params): Promise<{ content: { type: string; text: string }[] }> {
  const { query, maxResults } = schema.parse(params)

  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
    )

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Search failed: ${response.statusText}` }],
      }
    }

    const data = await response.json() as {
      AbstractText?: string
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>
    }

    const results: string[] = []

    if (data.AbstractText) {
      results.push(`Summary: ${data.AbstractText}`)
    }

    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, maxResults)) {
        if (topic.Text) {
          results.push(topic.Text)
        }
      }
    }

    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: `No results found for "${query}".` }],
      }
    }

    return {
      content: [{ type: 'text', text: `Search results for "${query}":\n${results.join('\n')}` }],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Search error: ${error instanceof Error ? error.message : String(error)}` }],
    }
  }
}
