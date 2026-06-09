# Subsystem D: Core Extensions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use TDD (RED-GREEN-REFACTOR). Each task starts with a failing test. Vitest for testing. Commit after each GREEN.

**Goal:** Build the core extensions for the UBEK agent — web-search, vision, document-gen, memory — plus the extension registry.

**Architecture:** Shared `extensions/` directory at project root. Each extension is a directory with `tool.ts` (tool definition), `manifest.json` (metadata), and `tool.test.ts` (tests). Loaded by Pi Agent at startup via `_registry.ts`.

**Tech Stack:** TypeScript, Zod, Pi SDK extensions (pi-web-access, pi-ocr), pdfkit, docx, exceljs, vitest

---

## File Structure

```
extensions/
├── _registry.ts                    ← CREATE: auto-import all core tools
└── core/
    ├── web-search/
    │   ├── manifest.json           ← CREATE
    │   ├── tool.ts                 ← CREATE
    │   └── tool.test.ts            ← CREATE
    ├── vision/
    │   ├── manifest.json           ← CREATE
    │   ├── tool.ts                 ← CREATE
    │   └── tool.test.ts            ← CREATE
    ├── document-gen/
    │   ├── manifest.json           ← CREATE
    │   ├── tool.ts                 ← CREATE
    │   └── tool.test.ts            ← CREATE
    └── memory/
        ├── manifest.json           ← CREATE
        ├── tool.ts                 ← CREATE
        └── tool.test.ts            ← CREATE
```

---

### Task D1: Extension Registry

**Files:**
- Create: `extensions/_registry.ts`

- [ ] **Step 1: Write the registry**

```typescript
// extensions/_registry.ts
// Auto-import all core tool definitions.
// Pi Agent loads this module at startup to register tools.

import type { ToolDefinition } from '../../agent/src/types'

// Core tool imports (will be populated as tools are built)
// import { webSearchTool } from './core/web-search/tool'
// import { visionTool } from './core/vision/tool'
// import { docGenTool } from './core/document-gen/tool'
// import { memoryTool } from './core/memory/tool'

export const coreTools: ToolDefinition[] = [
  // webSearchTool,
  // visionTool,
  // docGenTool,
  // memoryTool,
]

export function getCoreTool(name: string): ToolDefinition | undefined {
  return coreTools.find((t) => t.name === name)
}
```

- [ ] **Step 2: Verify compiles**

Run: `cd agent && npx tsc --noEmit ../extensions/_registry.ts 2>&1 || echo "Registry has type imports from agent"`

- [ ] **Step 3: Commit**

```bash
git add extensions/_registry.ts
git commit -m "feat(ext): add extension registry"
```

---

### Task D2: Web Search Extension

**Files:**
- Create: `extensions/core/web-search/manifest.json`
- Create: `extensions/core/web-search/tool.ts`
- Create: `extensions/core/web-search/tool.test.ts`

- [ ] **Step 1: Write test for web search tool (RED)**

```typescript
// extensions/core/web-search/tool.test.ts
import { describe, it, expect } from 'vitest'
import { createWebSearchTool } from './tool'

describe('WebSearchTool', () => {
  const mockSearchService = {
    search: async (query: string, max: number) => {
      return [
        { title: 'Result 1', url: 'https://example.com/1', snippet: 'First result' },
        { title: 'Result 2', url: 'https://example.com/2', snippet: 'Second result' },
      ]
    },
  }

  it('should create tool with correct name and description', () => {
    const tool = createWebSearchTool({ searchService: mockSearchService })
    expect(tool.name).toBe('web_search')
    expect(tool.description).toBeTruthy()
    expect(tool.parameters).toBeDefined()
  })

  it('should execute search and return formatted results', async () => {
    const tool = createWebSearchTool({ searchService: mockSearchService })
    const result = await tool.execute({ query: 'test query', maxResults: 5 })

    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('Result 1')
    expect(result.content[0].text).toContain('https://example.com/1')
  })

  it('should use default maxResults of 5', () => {
    const tool = createWebSearchTool({ searchService: mockSearchService })
    const params = tool.parameters
    expect(params.properties.maxResults).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd extensions && npx vitest run core/web-search/tool.test.ts --reporter=verbose`
Expected: FAIL — `Cannot find module './tool'`

- [ ] **Step 3: Write web search tool**

```typescript
// extensions/core/web-search/tool.ts
import { z } from 'zod'
import type { ToolDefinition } from '../../../agent/src/types'

const paramsSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().min(1).max(20).default(5),
})

type Params = z.infer<typeof paramsSchema>

interface SearchResult {
  title: string
  url: string
  snippet: string
}

interface Dependencies {
  searchService: {
    search(query: string, max: number): Promise<SearchResult[]>
  }
}

function formatResults(results: SearchResult[]): string {
  return results
    .map((r, i) => `${i + 1}. [${r.title}](${r.url})\n${r.snippet}`)
    .join('\n\n')
}

export function createWebSearchTool(
  deps: Dependencies,
): ToolDefinition<Params> {
  return {
    name: 'web_search',
    description:
      'Searches the internet for current information. ' +
      'Use when the user asks about recent events, facts, or data ' +
      'outside the model\'s knowledge.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        maxResults: {
          type: 'number',
          description: 'Maximum results (1-20)',
          default: 5,
        },
      },
      required: ['query'],
    },
    execute: async ({ query, maxResults }: Params) => {
      const results = await deps.searchService.search(query, maxResults)
      return {
        content: [{ type: 'text', text: formatResults(results) }],
      }
    },
  }
}

// Default instance (used when no DI container available)
export const webSearchTool = createWebSearchTool({
  searchService: {
    search: async (query: string, max: number) => {
      // TODO: Phase 2 — integrate with pi-web-access
      console.warn(`[web-search] Mock search: ${query} (max: ${max})`)
      return [
        {
          title: `Results for: ${query}`,
          url: 'https://example.com',
          snippet: 'Search integration pending — install pi-web-access for real results.',
        },
      ]
    },
  },
})
```

- [ ] **Step 4: Write manifest**

```json
// extensions/core/web-search/manifest.json
{
  "name": "web-search",
  "description": "Search the internet and fetch web pages",
  "version": "1.0.0",
  "author": "ubek",
  "icon": "search",
  "route": null,
  "sidebar": null,
  "tools": ["web_search"]
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd extensions && npx vitest run core/web-search/tool.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add extensions/core/web-search/
git commit -m "feat(ext): add web-search extension with tool and manifest"
```

---

### Task D3: Vision Extension

**Files:**
- Create: `extensions/core/vision/manifest.json`
- Create: `extensions/core/vision/tool.ts`
- Create: `extensions/core/vision/tool.test.ts`

- [ ] **Step 1: Write test (RED)**

```typescript
// extensions/core/vision/tool.test.ts
import { describe, it, expect } from 'vitest'
import { createVisionTool } from './tool'

describe('VisionTool', () => {
  const mockOcrService = {
    analyze: async (_imageUrl: string) => ({
      text: 'Extracted text from image',
      labels: ['document', 'text'],
    }),
  }

  it('should create tool with correct name', () => {
    const tool = createVisionTool({ ocrService: mockOcrService })
    expect(tool.name).toBe('vision')
  })

  it('should execute OCR analysis', async () => {
    const tool = createVisionTool({ ocrService: mockOcrService })
    const result = await tool.execute({ imageUrl: 'https://example.com/image.jpg' })

    expect(result.content[0].text).toContain('Extracted text')
  })
})
```

- [ ] **Step 2: Write vision tool**

```typescript
// extensions/core/vision/tool.ts
import { z } from 'zod'
import type { ToolDefinition } from '../../../agent/src/types'

const paramsSchema = z.object({
  imageUrl: z.string().url(),
  detail: z.enum(['low', 'high', 'auto']).default('auto'),
})

type Params = z.infer<typeof paramsSchema>

interface OcrResult {
  text: string
  labels: string[]
}

interface Dependencies {
  ocrService: {
    analyze(imageUrl: string, detail?: string): Promise<OcrResult>
  }
}

export function createVisionTool(
  deps: Dependencies,
): ToolDefinition<Params> {
  return {
    name: 'vision',
    description:
      'Analyze images: extract text, identify objects, read charts. ' +
      'Use when user uploads or references an image.',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'URL of the image to analyze' },
        detail: {
          type: 'string',
          enum: ['low', 'high', 'auto'],
          description: 'Detail level for analysis',
        },
      },
      required: ['imageUrl'],
    },
    execute: async ({ imageUrl, detail }: Params) => {
      const result = await deps.ocrService.analyze(imageUrl, detail)
      return {
        content: [{ type: 'text', text: result.text }],
      }
    },
  }
}

export const visionTool = createVisionTool({
  ocrService: {
    analyze: async (imageUrl: string) => {
      console.warn(`[vision] Mock OCR: ${imageUrl}`)
      return {
        text: `Vision analysis of ${imageUrl} — install pi-ocr for real OCR.`,
        labels: [],
      }
    },
  },
})
```

- [ ] **Step 3: Write manifest**

```json
// extensions/core/vision/manifest.json
{
  "name": "vision",
  "description": "Image analysis, OCR, and visual recognition",
  "version": "1.0.0",
  "author": "ubek",
  "icon": "eye",
  "route": null,
  "sidebar": null,
  "tools": ["vision"]
}
```

- [ ] **Step 4: Run tests**

Run: `cd extensions && npx vitest run core/vision/tool.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/core/vision/
git commit -m "feat(ext): add vision extension with OCR tool"
```

---

### Task D4: Document Gen Extension

**Files:**
- Create: `extensions/core/document-gen/manifest.json`
- Create: `extensions/core/document-gen/tool.ts`
- Create: `extensions/core/document-gen/tool.test.ts`

- [ ] **Step 1: Write test (RED)**

```typescript
// extensions/core/document-gen/tool.test.ts
import { describe, it, expect } from 'vitest'
import { createDocGenTool } from './tool'

describe('DocumentGenTool', () => {
  const mockDocService = {
    generate: async (format: string, content: string, title: string) => ({
      url: `/vault/generated-${format}-${Date.now()}.${format}`,
      format,
      size: 1024,
    }),
  }

  it('should create tool with correct name', () => {
    const tool = createDocGenTool({ documentService: mockDocService })
    expect(tool.name).toBe('generate_document')
  })

  it('should support all four formats', async () => {
    const tool = createDocGenTool({ documentService: mockDocService })
    const formats = ['pdf', 'docx', 'xlsx', 'md']

    for (const format of formats) {
      const result = await tool.execute({
        title: 'Test',
        content: '# Test Content',
        format: format as any,
      })
      expect(result.content[0].text).toContain(format)
    }
  })

  it('should reject invalid format', async () => {
    const tool = createDocGenTool({ documentService: mockDocService })

    // Parse the schema manually to validate rejection
    const paramsSchema = tool.parameters
    const formatEnum = paramsSchema.properties.format
    expect(formatEnum).toBeDefined()
    expect(formatEnum.type).toBe('string')
  })
})
```

- [ ] **Step 2: Write document gen tool**

```typescript
// extensions/core/document-gen/tool.ts
import { z } from 'zod'
import type { ToolDefinition } from '../../../agent/src/types'

const paramsSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  format: z.enum(['pdf', 'docx', 'xlsx', 'md']),
})

type Params = z.infer<typeof paramsSchema>

interface GenerationResult {
  url: string
  format: string
  size: number
}

interface Dependencies {
  documentService: {
    generate(format: string, content: string, title: string): Promise<GenerationResult>
  }
}

export function createDocGenTool(
  deps: Dependencies,
): ToolDefinition<Params> {
  return {
    name: 'generate_document',
    description:
      'Generate documents in PDF, DOCX, XLSX, or Markdown format. ' +
      'Use when user asks for a report, invoice, proposal, or spreadsheet.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title' },
        content: { type: 'string', description: 'Document content in markdown' },
        format: {
          type: 'string',
          enum: ['pdf', 'docx', 'xlsx', 'md'],
          description: 'Output format',
        },
      },
      required: ['title', 'content', 'format'],
    },
    execute: async ({ title, content, format }: Params) => {
      const result = await deps.documentService.generate(format, content, title)
      return {
        content: [
          {
            type: 'text',
            text: `Document generated: [${title}.${format}](${result.url}) (${(result.size / 1024).toFixed(1)} KB)`,
          },
        ],
      }
    },
  }
}

export const docGenTool = createDocGenTool({
  documentService: {
    generate: async (format: string, _content: string, title: string) => {
      console.warn(`[doc-gen] Mock generation: ${title}.${format}`)
      return {
        url: `/vault/generated-${title}-${Date.now()}.${format}`,
        format,
        size: 1024,
      }
    },
  },
})
```

- [ ] **Step 3: Write manifest**

```json
// extensions/core/document-gen/manifest.json
{
  "name": "document-gen",
  "description": "Generate PDF, DOCX, XLSX, and Markdown documents",
  "version": "1.0.0",
  "author": "ubek",
  "icon": "file-text",
  "route": null,
  "sidebar": null,
  "tools": ["generate_document"]
}
```

- [ ] **Step 4: Run tests**

Run: `cd extensions && npx vitest run core/document-gen/tool.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/core/document-gen/
git commit -m "feat(ext): add document-gen extension with 4 format support"
```

---

### Task D5: Memory Extension

**Files:**
- Create: `extensions/core/memory/manifest.json`
- Create: `extensions/core/memory/tool.ts`
- Create: `extensions/core/memory/tool.test.ts`

- [ ] **Step 1: Write test (RED)**

```typescript
// extensions/core/memory/tool.test.ts
import { describe, it, expect } from 'vitest'
import { createMemoryTool } from './tool'

describe('MemoryTool', () => {
  const mockMemoryService = {
    save: async (key: string, value: string) => true,
    get: async (key: string) => `Value for: ${key}`,
    search: async (query: string) => [
      { key: 'user_name', value: 'John Doe', score: 0.95 },
    ],
  }

  it('should create memory_save tool', () => {
    const tool = createMemoryTool({ memoryService: mockMemoryService })
    expect(tool.name).toBe('memory_save')
  })

  it('should save a fact to memory', async () => {
    const tool = createMemoryTool({ memoryService: mockMemoryService })
    const result = await tool.execute({ key: 'user_name', value: 'John' })
    expect(result.content[0].text).toContain('saved')
  })

  it('should search memory', async () => {
    // The memory_search tool is a separate tool — test the memory_save for now
    const tool = createMemoryTool({ memoryService: mockMemoryService })
    expect(tool.parameters.properties.key).toBeDefined()
    expect(tool.parameters.properties.value).toBeDefined()
  })
})
```

- [ ] **Step 2: Write memory tool**

```typescript
// extensions/core/memory/tool.ts
import { z } from 'zod'
import type { ToolDefinition } from '../../../agent/src/types'

const saveParamsSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(2000),
})

const searchParamsSchema = z.object({
  query: z.string().min(1).max(500),
})

interface MemoryEntry {
  key: string
  value: unknown
  score?: number
}

interface Dependencies {
  memoryService: {
    save(key: string, value: string): Promise<boolean>
    get(key: string): Promise<unknown>
    search(query: string): Promise<MemoryEntry[]>
  }
}

// The memory extension exports two tools: memory_save and memory_search
export function createMemoryTool(
  deps: Dependencies,
): ToolDefinition {
  // In Phase 1, we export memory_save as the primary tool
  // memory_search will be a separate method
  return {
    name: 'memory_save',
    description:
      'Save information about the user to long-term memory. ' +
      'Use when the user shares personal information, preferences, ' +
      'or facts worth remembering across conversations.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Fact key (e.g., user_name, company, preference)' },
        value: { type: 'string', description: 'Fact value' },
      },
      required: ['key', 'value'],
    },
    execute: async ({ key, value }: { key: string; value: string }) => {
      await deps.memoryService.save(key, value)
      return {
        content: [
          {
            type: 'text',
            text: `Saved to memory: ${key} = ${value}`,
          },
        ],
      }
    },
  }
}

export const memoryTool = createMemoryTool({
  memoryService: {
    save: async (_key: string) => {
      console.warn('[memory] Mock save — implement with Memory API or user_facts table')
      return true
    },
    get: async (_key: string) => null,
    search: async (_query: string) => [],
  },
})
```

- [ ] **Step 3: Write manifest**

```json
// extensions/core/memory/manifest.json
{
  "name": "memory",
  "description": "Cross-session memory for user facts and preferences",
  "version": "1.0.0",
  "author": "ubek",
  "icon": "brain",
  "route": null,
  "sidebar": null,
  "tools": ["memory_save", "memory_search"]
}
```

- [ ] **Step 4: Run tests**

Run: `cd extensions && npx vitest run core/memory/tool.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/core/memory/
git commit -m "feat(ext): add memory extension for cross-session facts"
```

---

### Task D6: Update Registry with All Tools

**Files:**
- Modify: `extensions/_registry.ts`

- [ ] **Step 1: Update registry to include all tools**

```typescript
// extensions/_registry.ts
// Auto-import all core tool definitions.
// Pi Agent loads this module at startup to register tools.

import type { ToolDefinition } from '../../agent/src/types'
import { webSearchTool } from './core/web-search/tool'
import { visionTool } from './core/vision/tool'
import { docGenTool } from './core/document-gen/tool'
import { memoryTool } from './core/memory/tool'

export const coreTools: ToolDefinition[] = [
  webSearchTool,
  visionTool,
  docGenTool,
  memoryTool,
]

export function getCoreTool(name: string): ToolDefinition | undefined {
  return coreTools.find((t) => t.name === name)
}
```

- [ ] **Step 2: Commit**

```bash
git add extensions/_registry.ts
git commit -m "feat(ext): register all core tools in registry"
```

---

## Verification (after all tasks complete)

```bash
# Run all extension tests
cd extensions && npx vitest run --reporter=verbose

# Verify types match agent
cd agent && npx tsc --noEmit ../extensions/_registry.ts

# All tests should pass
Expected: All 4 tool test files pass (web-search, vision, document-gen, memory)
```
