# Core Extensions — Standard Jakości

## Struktura

```
extensions/core/
├── web-search/
│   ├── tool.ts              ← definicja toola
│   └── tool.test.ts         ← testy
├── vision/
│   ├── tool.ts
│   └── tool.test.ts
├── document-gen/
│   ├── tool.ts
│   └── tool.test.ts
├── memory/
│   ├── tool.ts
│   └── tool.test.ts
└── _registry.ts             ← auto-import wszystkich tool.ts
```

## Wzór tool.ts

```typescript
import { z } from 'zod'
import type { ToolDefinition } from 'agent/src/types'

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

function formatResults(results: SearchResult[]): string {
  return results
    .map((r, i) => `${i + 1}. [${r.title}](${r.url})\n${r.snippet}`)
    .join('\n\n')
}

interface Dependencies {
  searchService: { search(query: string, max: number): Promise<SearchResult[]> }
}

export function createWebSearchTool(deps: Dependencies): ToolDefinition<Params> {
  return {
    name: 'web_search',
    description:
      'Szuka informacji w internecie. ' +
      'Użyj gdy użytkownik pyta o aktualne wydarzenia, ' +
      'fakty, dane lub informacje spoza wiedzy modelu.',
    parameters: paramsSchema,
    execute: async ({ query, maxResults }) => {
      const results = await deps.searchService.search(query, maxResults)
      return {
        content: [{ type: 'text', text: formatResults(results) }],
      }
    },
  }
}
```

## Zasady

1. **Typowane parametry** — Zod schema, nigdy `any`
2. **DI (Dependency Injection)** — serwisy wstrzykiwane przez `createTool(deps)`, nigdy `new Service()` inline
3. **Brak emoji w logice** — emoji tylko w UI layer (AI Elements)
4. **Jeden error handler** — centralny handler w `_registry.ts`, nie duplikacja w każdym toolu
5. **Brak `process.env`** — wszystko przez config object w Dependencies
6. **Brak direct DB** — DB access tylko przez serwisy
7. **Testowalność** — każdy tool ma testy z mockowanymi zależnościami
8. **Krótkie opisy** — tool description precyzyjny dla LLM (<200 znaków)

## Default Tools (Phase 1)

| Tool | Pakiet | Opis |
|------|--------|------|
| `web_search` | `pi-web-access` | Web search + URL fetch |
| `vision` | `pi-ocr` | OCR + vision analysis |
| `document_gen` | pdfkit/docx/exceljs | PDF/DOCX/XLSX/MD generation |
| `memory_search` | Memory API (:18766) | Long-term memory search |
| `memory_save` | Memory API (:18766) | Save facts to memory |

## Pi SDK vs Direct API

Tools używają **Pi SDK native** gdzie to możliwe:
- `pi-web-access` i `pi-ocr` to Pi extensions — rejestrują się przez `pi.registerTool()`
- W _registry.ts importujemy je i dodajemy do `customTools`

Jeśli Pi SDK nie ma narzędzia (np. document-gen), implementujemy własny tool wg powyższego wzoru.
