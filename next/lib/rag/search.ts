export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export interface SearchableChunk {
  id: string
  text: string
  embedding: number[]
}

export interface ScoredResult {
  id: string
  text: string
  score: number
}

export function searchChunks(
  queryEmbedding: number[],
  chunks: SearchableChunk[],
  topK = 5,
): ScoredResult[] {
  return chunks
    .map(chunk => ({
      id: chunk.id,
      text: chunk.text,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
