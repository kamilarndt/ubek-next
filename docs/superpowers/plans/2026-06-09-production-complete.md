# UBEK Next — Production Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring UBEK Next from 82% → 100% production-ready state: fix all blocking issues, complete missing features, harden security, add deployment infra.

**Architecture:** Two-process system (Next.js :3000 + Pi Agent :4000). Frontend uses shadcn/ui + AI SDK v6. Backend uses PostgreSQL via Drizzle ORM. Auth via JWT httpOnly + CSRF double-submit.

**Tech Stack:** Next.js 15 App Router, AI SDK v6, Pi Agent Express, PostgreSQL 17, Drizzle ORM, shadcn/ui, Tailwind CSS v4, Docker, PM2, Playwright

**Status przed planem:** 82% app, 179 testów (72 agent + 107 next), 0 błędów TypeScript

---

## File Structure — co będzie tworzone/modyfikowane

### Phase 0 — Critical Fixes
| Plik | Operacja | Odpowiedzialność |
|------|----------|------------------|
| `next/app/auth/layout.tsx` | 🔧 Fix | Usunąć podwójne `<html>/<body>`, użyć Metadata API |
| `next/app/api/health/route.ts` | ✨ Create | Health endpoint dla Next.js |
| `agent/src/routes/chat.ts` | 🔧 Fix | Dodać ładowanie `projects.instructions` jako system prompt |
| `docker-compose.yml` | 🔧 Fix | Usunąć hardcoded secrets, dodać `${VARIABLE}` placeholders |
| `next/app/api/admin/*` | ✨ Create | Admin API routes (extension requests CRUD) |
| `next/app/api/extensions/*` | ✨ Create | Extensions API routes |

### Phase 1 — Backend Features
| Plik | Operacja | Odpowiedzialność |
|------|----------|------------------|
| `next/app/api/kb/*` | ✨ Create | RAG Knowledge Base API (upload, search, ingest) |
| `next/lib/rag/chunk.ts` | ✨ Create | Text chunking service |
| `next/lib/rag/embed.ts` | ✨ Create | Embedding service (Router LLM integration) |
| `next/lib/rag/search.ts` | ✨ Create | Semantic search service |
| `next/middleware.ts` | 🔧 Fix | Integracja AuditLogger z request flow |
| `next/lib/audit-logger.ts` | ✨ Create | AuditLogger helper (wraps auditLogStore) |
| `next/app/api/chat/stream/route.ts` | 🔧 Fix | System prompt per project, conversation resume |

### Phase 2 — Frontend Features
| Plik | Operacja | Odpowiedzialność |
|------|----------|------------------|
| `next/app/(dashboard)/admin/page.tsx` | 🔧 Fix | Zastąpić mock data realnymi API |
| `next/app/(dashboard)/ext/[name]/page.tsx` | 🔧 Fix | Dynamiczny extension UI loader |
| `next/components/chat/chat-tool-call.tsx` | ✨ Create | Renderowanie tool calls w czacie |
| `next/app/(dashboard)/settings/page.tsx` | 🔧 Fix | Language preference, system prompt config |
| `next/components/chat/chat-attachment.tsx` | ✨ Create | File attachment UI do czatu |

### Phase 3 — Testing
| Plik | Operacja | Odpowiedzialność |
|------|----------|------------------|
| `next/app/__tests__/api/admin.test.ts` | ✨ Create | Admin API tests |
| `next/e2e/*.spec.ts` | ✨ Create | Playwright E2E tests |
| `agent/src/__tests__/system-prompt.test.ts` | ✨ Create | System prompt loading test |

### Phase 4 — Production Infra
| Plik | Operacja | Odpowiedzialność |
|------|----------|------------------|
| `Dockerfile.next` | ✨ Create | Multi-stage Next.js build |
| `Dockerfile.agent` | ✨ Create | Multi-stage Agent build |
| `nginx.conf` | ✨ Create | Reverse proxy config |
| `.github/workflows/ci.yml` | ✨ Create | CI pipeline (lint, test, build) |
| `scripts/dev.sh` | ✨ Create | Development startup script |

---

## Phase 0: Critical Fixes (priorytet: BLOKER)

### Task 0.1: Fix auth layout hydration

**Files:**
- Modify: `next/app/auth/layout.tsx`
- Test: ręczna weryfikacja — brak hydration warning w konsoli

- [ ] **Step 1: Przeczytaj obecny auth layout**

```bash
cat next/app/auth/layout.tsx
```

Spodziewany problem: layout ma własny `<html>` i `<body>` które kolidują z root layoutem.

- [ ] **Step 2: Napraw auth layout**

```tsx
// next/app/auth/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      {children}
    </div>
  )
}
```

Usuń własne `<html>`, `<body>`, `<head>`. Root layout już je dostarcza.

- [ ] **Step 3: Zweryfikuj**

```bash
cd next && npx tsc --noEmit | grep -c error
```
Oczekiwane: 0

- [ ] **Step 4: Commit**

```bash
git add next/app/auth/layout.tsx
git commit -m "fix: auth layout hydration conflict (double html/body)"
```

### Task 0.2: Add Next.js health route

**Files:**
- Create: `next/app/api/health/route.ts`

- [ ] **Step 1: Utwórz health route**

```tsx
// next/app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
```

- [ ] **Step 2: Dodaj test**

```ts
// next/app/__tests__/api/health.test.ts
import { describe, it, expect } from 'vitest'

describe('GET /api/health', () => {
  it('should return 200 with status ok', async () => {
    const { GET } = await import('@/app/api/health/route')
    const res = await GET()
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.timestamp).toBeDefined()
  })
})
```

- [ ] **Step 3: Zweryfikuj**

```bash
cd next && npx vitest run app/__tests__/api/health.test.ts 2>&1 | grep -c "passed"
```

Oczekiwane: 1 (test passed)

- [ ] **Step 4: Commit**

```bash
git add next/app/api/health/route.ts next/app/__tests__/api/health.test.ts
git commit -m "feat: add Next.js health endpoint"
```

### Task 0.3: System prompt per project

**Files:**
- Modify: `agent/src/routes/chat.ts`
- Modify: `agent/src/types.ts`

- [ ] **Step 1: Dodaj pole `instructions` do typu Config**

```ts
// agent/src/types.ts — dodaj do Config
export interface Config {
  // ... existing fields
  defaultSystemPrompt?: string
}
```

- [ ] **Step 2: Zmodyfikuj chat route aby ładował system prompt**

W `agent/src/routes/chat.ts`, w funkcji `doStreamingCall`:

```ts
// Przed pętlą while, dodaj system prompt jeśli istnieje
const systemMessage = config.defaultSystemPrompt
  ? { role: 'system' as const, content: config.defaultSystemPrompt }
  : null

let currentMessages: ChatMessage[] = systemMessage
  ? [systemMessage, ...messages]
  : [...messages]
```

- [ ] **Step 3: Dodaj test**

```ts
// agent/src/__tests__/system-prompt.test.ts
import { describe, it, expect } from 'vitest'

describe('System Prompt', () => {
  it('should prepend system message when defaultSystemPrompt is set', () => {
    const config = { defaultSystemPrompt: 'You are helpful' }
    const messages = [{ role: 'user' as const, content: 'hi' }]
    const systemMessage = config.defaultSystemPrompt
      ? { role: 'system' as const, content: config.defaultSystemPrompt }
      : null
    const result = systemMessage ? [systemMessage, ...messages] : messages
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('system')
    expect(result[0].content).toBe('You are helpful')
  })

  it('should not prepend system message when not set', () => {
    const config = {}
    const messages = [{ role: 'user' as const, content: 'hi' }]
    const systemMessage = (config as any).defaultSystemPrompt
      ? { role: 'system' as const, content: (config as any).defaultSystemPrompt }
      : null
    const result = systemMessage ? [systemMessage, ...messages] : messages
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 4: Zweryfikuj**

```bash
cd agent && npx vitest run src/__tests__/system-prompt.test.ts 2>&1 | grep -c "passed"
```

Oczekiwane: 2 (oba testy)

- [ ] **Step 5: Commit**

```bash
git add agent/src/routes/chat.ts agent/src/types.ts agent/src/__tests__/system-prompt.test.ts
git commit -m "feat: add system prompt per project support"
```

### Task 0.4: Secure docker-compose secrets

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Usuń hardcoded secrets z docker-compose.yml**

Zamień:
```yaml
services:
  agent:
    environment:
      JWT_SECRET: 'dev-jwt-secret-change-in-production'
      AGENT_API_KEY: 'dev-agent-api-key-change-in-production'
      ROUTER_API_KEY: 'dev-router-api-key-change-in-production'
```
Na:
```yaml
services:
  agent:
    environment:
      JWT_SECRET: ${JWT_SECRET}
      AGENT_API_KEY: ${AGENT_API_KEY}
      ROUTER_API_KEY: ${ROUTER_API_KEY}
```

- [ ] **Step 2: Upewnij się że `.env.example` zawiera wszystkie zmienne**

```bash
cat .env.example | grep -E "^[A-Z_]+\="
```

Oczekiwane: JWT_SECRET, AGENT_API_KEY, ROUTER_API_KEY, ROUTER_URL, DATABASE_URL, itp.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "fix: remove hardcoded secrets from docker-compose.yml"
```

### Task 0.5: Admin + Extensions API routes

**Files:**
- Create: `next/app/api/admin/extension-requests/route.ts`
- Create: `next/app/api/admin/extension-requests/[id]/route.ts`
- Create: `next/app/api/extensions/route.ts`

- [ ] **Step 1: Admin extension requests — list + status update**

```ts
// next/app/api/admin/extension-requests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { extensionRequestStore } from '@/lib/store'

export async function GET() {
  const requests = await extensionRequestStore.list()
  return NextResponse.json(requests)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id, status } = body
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  }
  const updated = await extensionRequestStore.updateStatus(id, status)
  return NextResponse.json(updated)
}
```

- [ ] **Step 2: Extensions list route**

```ts
// next/app/api/extensions/route.ts
import { NextResponse } from 'next/server'
import { extensionStore } from '@/lib/store'

export async function GET() {
  const extensions = await extensionStore.list()
  return NextResponse.json(extensions)
}
```

- [ ] **Step 3: Dodaj testy**

```ts
// next/app/__tests__/api/admin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockList = vi.fn().mockResolvedValue([])
const mockUpdateStatus = vi.fn()

vi.mock('@/lib/store', () => ({
  extensionRequestStore: { list: mockList, updateStatus: mockUpdateStatus },
  extensionStore: { list: vi.fn().mockResolvedValue([]) },
}))

describe('Admin API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET /api/admin/extension-requests should return list', async () => {
    const { GET } = await import('@/app/api/admin/extension-requests/route')
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('POST should reject missing fields', async () => {
    const { POST } = await import('@/app/api/admin/extension-requests/route')
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 4: Zweryfikuj**

```bash
cd next && npx vitest run app/__tests__/api/admin.test.ts 2>&1 | grep -c "passed"
```

Oczekiwane: 2

- [ ] **Step 5: Commit**

```bash
git add next/app/api/admin/ next/app/api/extensions/ next/app/__tests__/api/admin.test.ts
git commit -m "feat: admin and extensions API routes"
```

---

## Phase 1: Backend Features

### Task 1.1: AuditLogger middleware integration

**Files:**
- Create: `next/lib/audit-logger.ts`
- Modify: `next/middleware.ts`

- [ ] **Step 1: Utwórz AuditLogger helper**

```ts
// next/lib/audit-logger.ts
import { auditLogStore } from '@/lib/store'

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_REGISTER'
  | 'CHAT_MESSAGE'
  | 'PROJECT_CREATE'
  | 'PROJECT_DELETE'
  | 'VAULT_UPLOAD'
  | 'VAULT_DELETE'
  | 'EXTENSION_REQUEST'
  | 'ADMIN_ACTION'

export async function logAudit(params: {
  userId: string
  action: AuditAction
  resource?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await auditLogStore.create({
      userId: params.userId,
      action: params.action,
      metadata: {
        ...params.metadata,
        resource: params.resource,
        resourceId: params.resourceId,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[audit] failed to log:', error)
  }
}
```

- [ ] **Step 2: Dodaj test**

```ts
// next/app/__tests__/guardrails/audit-logger-v2.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn().mockResolvedValue({ id: 'log-1' })
vi.mock('@/lib/store', () => ({
  auditLogStore: { create: mockCreate },
}))

describe('AuditLogger v2', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should log login action', async () => {
    const { logAudit } = await import('@/lib/audit-logger')
    await logAudit({ userId: 'user-1', action: 'USER_LOGIN' })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_LOGIN', userId: 'user-1' }),
    )
  })

  it('should not throw on error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB error'))
    const { logAudit } = await import('@/lib/audit-logger')
    await expect(logAudit({ userId: 'user-1', action: 'CHAT_MESSAGE' })).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 3: Zweryfikuj**

```bash
cd next && npx vitest run app/__tests__/guardrails/audit-logger-v2.test.ts 2>&1 | grep "Tests"
```

Oczekiwane: 2 passed

- [ ] **Step 4: Commit**

```bash
git add next/lib/audit-logger.ts next/app/__tests__/guardrails/audit-logger-v2.test.ts
git commit -m "feat: audit logger helper with action types"
```

### Task 1.2: Admin page — real API data

**Files:**
- Modify: `next/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1: Zastąp mock data fetchowaniem z API**

W `next/app/(dashboard)/admin/page.tsx`:
- Zamień `placeholderRequests` na `useEffect` + `fetch('/api/admin/extension-requests')`
- Dodaj loading state, error state, empty state
- Approve/Reject → POST do `/api/admin/extension-requests`

```tsx
const [requests, setRequests] = useState<ExtensionRequest[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  fetch('/api/admin/extension-requests')
    .then(r => r.json())
    .then(setRequests)
    .catch(e => setError(e.message))
    .finally(() => setLoading(false))
}, [])

const handleStatusChange = async (id: string, status: string) => {
  await fetch('/api/admin/extension-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeader() },
    body: JSON.stringify({ id, status }),
  })
  setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
}
```

- [ ] **Step 2: Zweryfikuj TypeScript**

```bash
cd next && npx tsc --noEmit 2>&1 | grep -c error
```
Oczekiwane: 0

- [ ] **Step 3: Commit**

```bash
git add next/app/\(dashboard\)/admin/page.tsx
git commit -m "feat: admin page with real API data"
```

### Task 1.3: RAG Knowledge Base — schema + chunking

**Files:**
- Create: `next/lib/rag/chunk.ts`
- Create: `next/lib/rag/types.ts`
- Create: `next/app/api/kb/upload/route.ts`
- Create: `next/app/api/kb/search/route.ts`

- [ ] **Step 1: Utwórz typy RAG**

```ts
// next/lib/rag/types.ts
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
```

- [ ] **Step 2: Utwórz chunking service**

```ts
// next/lib/rag/chunk.ts
export function chunkText(text: string, maxSize = 512): string[] {
  const chunks: string[] = []
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text]
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > maxSize && current.length > 0) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks
}
```

- [ ] **Step 3: Dodaj test chunkowania**

```ts
// next/app/__tests__/rag/chunk.test.ts
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
})
```

- [ ] **Step 4: Zweryfikuj**

```bash
cd next && npx vitest run app/__tests__/rag/chunk.test.ts 2>&1 | grep "Tests"
```
Oczekiwane: 3 passed

- [ ] **Step 5: Commit**

```bash
git add next/lib/rag/ next/app/__tests__/rag/
git commit -m "feat: RAG chunking service"
```

---

## Phase 2: Frontend Features

### Task 2.1: Tool calls visualization w czacie

**Files:**
- Modify: `next/components/chat/chat-message.tsx`
- Create: `next/components/chat/chat-tool-call.tsx`

- [ ] **Step 1: Utwórz ChatToolCall komponent**

```tsx
// next/components/chat/chat-tool-call.tsx
'use client'

import { cn } from '@/lib/utils'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface ToolCallProps {
  toolName: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input?: Record<string, unknown>
  output?: unknown
  errorText?: string
}

export function ChatToolCall({ toolName, state, input, output, errorText }: ToolCallProps) {
  return (
    <div className={cn(
      'my-2 p-3 rounded-lg border text-sm',
      'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700',
    )}>
      <div className="flex items-center gap-2 mb-1">
        {state === 'input-streaming' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        {state === 'output-available' && <CheckCircle className="w-4 h-4 text-green-500" />}
        {state === 'output-error' && <XCircle className="w-4 h-4 text-red-500" />}
        <span className="font-mono text-xs font-medium">{toolName}</span>
      </div>
      {input && state === 'input-available' && (
        <pre className="text-xs mt-1 overflow-x-auto">{JSON.stringify(input, null, 1)}</pre>
      )}
      {output && state === 'output-available' && (
        <pre className="text-xs mt-1 text-green-700 dark:text-green-300 overflow-x-auto">
          {typeof output === 'string' ? output : JSON.stringify(output, null, 1)}
        </pre>
      )}
      {errorText && (
        <p className="text-xs mt-1 text-red-500">{errorText}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Zintegruj w ChatMessage**

W `next/components/chat/chat-message.tsx`, w switchu dodaj:

```tsx
case 'tool-call': {
  const toolName = (part as any).toolName || 'tool'
  const input = (part as any).input
  return (
    <ChatToolCall
      toolName={toolName}
      state="input-available"
      input={input}
    />
  )
}
case 'tool-result': {
  return (
    <ChatToolCall
      toolName={(part as any).toolName || 'tool'}
      state="output-available"
      output={(part as any).output}
    />
  )
}
```

- [ ] **Step 3: Zweryfikuj TypeScript**

```bash
cd next && npx tsc --noEmit 2>&1 | grep -c "chat-tool-call\|chat-message"
```
Oczekiwane: 0 błędów

- [ ] **Step 4: Commit**

```bash
git add next/components/chat/chat-tool-call.tsx next/components/chat/chat-message.tsx
git commit -m "feat: tool call visualization in chat"
```

---

## Phase 3: Testowanie i Hardenizacja

### Task 3.1: Playwright E2E testy

**Files:**
- Create: `next/e2e/auth.spec.ts`
- Create: `next/e2e/chat.spec.ts`
- Create: `next/e2e/vault.spec.ts`
- Create: `next/playwright.config.ts`

- [ ] **Step 1: Zainstaluj Playwright**

```bash
cd next && npm install -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Utwórz konfigurację**

```ts
// next/playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  webServer: [
    { command: 'cd .. && docker compose up -d', port: 5433, reuseExistingServer: true },
    { command: 'npm run dev', port: 3000, reuseExistingServer: true },
    { command: 'cd ../agent && npm run dev', port: 4000, reuseExistingServer: true },
  ],
})
```

- [ ] **Step 3: E2E auth test**

```ts
// next/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('should redirect unauthenticated user to login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/auth\/login/)
})

test('should register and login', async ({ page }) => {
  const email = `test-${Date.now()}@example.com`
  const password = 'TestPass123!'
  
  await page.goto('/auth/register')
  await page.fill('input[id="name"]', 'Test User')
  await page.fill('input[id="email"]', email)
  await page.fill('input[id="password"]', password)
  await page.fill('input[id="confirmPassword"]', password)
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL(/\/dashboard/)
})

test('should show error for wrong credentials', async ({ page }) => {
  await page.goto('/auth/login')
  await page.fill('input[id="email"]', 'wrong@example.com')
  await page.fill('input[id="password"]', 'wrongpass')
  await page.click('button[type="submit"]')
  
  await expect(page.locator('text=Login failed')).toBeVisible()
})
```

- [ ] **Step 4: Add package.json scripts**

```json
// w next/package.json — dodaj do "scripts"
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 5: Commit**

```bash
git add next/playwright.config.ts next/e2e/ next/package.json
git commit -m "test: add Playwright E2E tests"
```

### Task 3.2: Fix vault.test.ts

**Files:**
- Modify: `next/app/__tests__/api/vault.test.ts`

- [ ] **Step 1: Znajdź i napraw test który próbuje czytać fizyczny plik**

Problem: test próbuje odczytać `uploads/test.txt` który nie istnieje.
Fix: Zmockować `fs.readFile` lub użyć `vi.mock` dla fs.

```ts
// W vault.test.ts — dodaj na górze
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('test content')),
  stat: vi.fn().mockResolvedValue({ size: 100, isFile: () => true }),
}))
```

- [ ] **Step 2: Zweryfikuj**

```bash
cd next && npx vitest run app/__tests__/api/vault.test.ts 2>&1 | grep "Tests"
```
Oczekiwane: wszystkie vault testy passed

- [ ] **Step 3: Commit**

```bash
git add next/app/__tests__/api/vault.test.ts
git commit -m "fix: vault test file reading, mock fs instead of physical file"
```

---

## Phase 4: Production Infra

### Task 4.1: Dockerfiles + CI

**Files:**
- Create: `Dockerfile.next`
- Create: `Dockerfile.agent`
- Create: `.github/workflows/ci.yml`
- Create: `scripts/dev.sh`

- [ ] **Step 1: Next.js Dockerfile**

```dockerfile
# Dockerfile.next
FROM node:22-alpine AS builder
WORKDIR /app
COPY next/package*.json ./
RUN npm ci
COPY next/ .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 2: Agent Dockerfile**

```dockerfile
# Dockerfile.agent
FROM node:22-alpine AS builder
WORKDIR /app
COPY agent/package*.json ./
RUN npm ci
COPY agent/ .
COPY extensions/ ./extensions/
RUN npx tsc

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/extensions ./extensions
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 3: CI pipeline**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: ubek_next_test
          POSTGRES_USER: ubek
          POSTGRES_PASSWORD: ubek
        ports: [5433:5432]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      
      - name: Agent tests
        working-directory: agent
        run: |
          npm ci
          npx vitest run
        
      - name: Next.js tests
        working-directory: next
        run: |
          npm ci
          npx tsc --noEmit
          npx vitest run
        
      - name: Build
        working-directory: next
        run: npm run build
```

- [ ] **Step 4: Development script**

```bash
# scripts/dev.sh
#!/bin/bash
set -e
echo "🚀 Starting UBEK Next development environment..."

# Start infrastructure
echo "📦 Starting PostgreSQL..."
docker compose up -d postgres

# Run migrations
echo "🗄️ Running database migrations..."
cd next && npm run db:push

# Seed data
echo "🌱 Seeding database..."
npm run db:seed

# Start Pi Agent in background
echo "🤖 Starting Pi Agent..."
cd ../agent && npm run dev &
AGENT_PID=$!

# Start Next.js
echo "🌐 Starting Next.js..."
cd ../next && npm run dev &
NEXT_PID=$!

echo "✅ UBEK Next is running!"
echo "   Frontend: http://localhost:3000"
echo "   Agent:    http://localhost:4000"

trap "kill $AGENT_PID $NEXT_PID 2>/dev/null" EXIT
wait
```

- [ ] **Step 5: Commit**

```bash
git add Dockerfile.next Dockerfile.agent .github/workflows/ci.yml scripts/dev.sh
chmod +x scripts/dev.sh
git commit -m "infra: Dockerfiles, CI pipeline, dev script"
```

---

## Podsumowanie — pozostałe do zrobienia

| Obszar | Zadania | Szacowany czas |
|--------|---------|----------------|
| **F-04: PL/EN language detection** | Nie ujęte w planie — niski priorytet | — |
| **F-10: RAG / Knowledge Base full** | Chunking ✅, embedding i search ❌ | +2 taski |
| **F-11: Deep Research** | Nie ujęte — osobny epik | — |
| **F-06: AI Elements (oficjalne)** | Decyzja: użyć custom (obecne) czy AI Elements | — |
| **Conversation history resume** | Wymaga: `id` w useChat + `initialMessages` | +1 task |
| **Performance (Lighthouse)** | Po wdrożeniu infra | +1 task |
| **Security audit (pentest)** | Przed deployem | +1 task |

### Uruchomienie końcowe

Po zaimplementowaniu wszystkich faz:

```bash
# 1. Build
cd next && npm run build
cd ../agent && npx tsc

# 2. Test
cd next && npx vitest run
cd ../agent && npx vitest run

# 3. E2E
cd next && npx playwright test

# 4. TypeScript
cd next && npx tsc --noEmit
cd ../agent && npx tsc --noEmit

# 5. Deploy
docker compose up -d --build
```
