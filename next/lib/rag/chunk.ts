function splitByWords(text: string, maxSize: number): string[] {
  const words = text.split(' ')
  const chunks: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxSize && current.length > 0) {
      chunks.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

export function chunkText(text: string, maxSize = 512): string[] {
  if (!text) return []

  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text]
  const accumulated: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > maxSize && current.length > 0) {
      accumulated.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }

  if (current.trim()) {
    accumulated.push(current.trim())
  }

  // Split any chunk that still exceeds maxSize by word boundaries
  const chunks: string[] = []
  for (const chunk of accumulated) {
    if (chunk.length > maxSize) {
      chunks.push(...splitByWords(chunk, maxSize))
    } else {
      chunks.push(chunk)
    }
  }

  return chunks
}
