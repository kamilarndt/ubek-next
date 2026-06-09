export interface ChunkInput {
  fileId: string
  projectId: string
  text: string
  index: number
}

export interface SearchInput {
  query: string
  projectId: string
  limit?: number
}

export interface SearchResult {
  chunkId: string
  fileId: string
  text: string
  score: number
}
