import { describe, it, expect } from 'vitest'
import { chunkText } from '@/lib/rag/chunk'

describe('chunkText', () => {
  it('should split text into chunks', () => {
    const text = 'First sentence. Second sentence. Third sentence.'
    const chunks = chunkText(text, 20)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    expect(chunks[0]).toContain('First')
  })

  it('should handle empty text', () => {
    expect(chunkText('')).toEqual([])
  })

  it('should handle single sentence under maxSize', () => {
    const chunks = chunkText('Short.', 100)
    expect(chunks).toEqual(['Short.'])
  })

  it('should handle text without punctuation', () => {
    const text = 'word1 word2 word3 word4 word5'
    const chunks = chunkText(text, 15)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
  })
})

