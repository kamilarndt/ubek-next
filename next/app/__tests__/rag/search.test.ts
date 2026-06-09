import { describe, it, expect } from 'vitest'
import { cosineSimilarity, searchChunks } from '@/lib/rag/search'

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5)
  })

  it('should return 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5)
  })

  it('should return -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5)
  })

  it('should return 0 when first vector is zero', () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0)
  })

  it('should return 0 when second vector is zero', () => {
    expect(cosineSimilarity([1, 0], [0, 0])).toBe(0)
  })

  it('should handle fractional similarity', () => {
    const result = cosineSimilarity([1, 1], [1, 0])
    expect(result).toBeCloseTo(0.7071, 3)
  })

  it('should handle high-dimensional vectors', () => {
    const a = Array(1536).fill(0).map((_, i) => i * 0.001)
    const b = Array(1536).fill(0).map((_, i) => i * 0.001)
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5)
  })
})

describe('searchChunks', () => {
  it('should return top K results sorted by score', () => {
    const chunks = [
      { id: '1', text: 'a', embedding: [1, 0, 0] },
      { id: '2', text: 'b', embedding: [0, 1, 0] },
      { id: '3', text: 'c', embedding: [0, 0, 1] },
    ]
    const queryEmbedding = [1, 0.1, 0]
    const results = searchChunks(queryEmbedding, chunks, 2)
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe('1')
    expect(results[1].id).toBe('2')
  })

  it('should return all chunks when topK exceeds count', () => {
    const chunks = [
      { id: '1', text: 'a', embedding: [1, 0] },
      { id: '2', text: 'b', embedding: [0, 1] },
    ]
    const queryEmbedding = [1, 0]
    const results = searchChunks(queryEmbedding, chunks, 10)
    expect(results).toHaveLength(2)
  })

  it('should return empty array for empty chunks', () => {
    const results = searchChunks([1, 0], [], 5)
    expect(results).toEqual([])
  })

  it('should return results sorted by descending score', () => {
    const chunks = [
      { id: 'a', text: 'x', embedding: [0, 1, 0] },
      { id: 'b', text: 'y', embedding: [1, 0, 0] },
      { id: 'c', text: 'z', embedding: [0.5, 0.5, 0] },
    ]
    const queryEmbedding = [1, 0, 0]
    const results = searchChunks(queryEmbedding, chunks, 3)

    expect(results[0].id).toBe('b') // highest: cos([1,0,0], [1,0,0]) = 1
    expect(results[1].id).toBe('c') // medium: cos([1,0,0], [0.5,0.5,0]) ≈ 0.707
    expect(results[2].id).toBe('a') // lowest: cos([1,0,0], [0,1,0]) = 0

    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
    expect(results[1].score).toBeGreaterThanOrEqual(results[2].score)
  })

  it('should return results with id, text, and score fields', () => {
    const chunks = [
      { id: '1', text: 'hello world', embedding: [1, 0] },
    ]
    const queryEmbedding = [1, 0]
    const results = searchChunks(queryEmbedding, chunks, 1)

    expect(results[0]).toEqual({
      id: '1',
      text: 'hello world',
      score: expect.any(Number),
    })
  })

  it('should default topK to 5', () => {
    const chunks = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      text: `chunk-${i}`,
      embedding: [Math.random(), Math.random()],
    }))
    const queryEmbedding = [1, 0]
    const results = searchChunks(queryEmbedding, chunks)
    expect(results).toHaveLength(5)
  })
})
