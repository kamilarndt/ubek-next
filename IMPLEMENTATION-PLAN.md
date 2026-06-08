# Plan Implementacji — UBEK Next

## Architektura

```
Next.js 15 (:3000)                    Pi Agent Express (:4000)
┌──────────────────────────┐        ┌────────────────────────┐
│  AI Elements + shadcn/ui │        │  Pi SDK AgentSession   │
│  useChat()               │ ◄───── │  TenantSessionPool     │
│  DefaultChatTransport    │  SSE   │  SKILL.md per tenant   │
│  → localhost:4000       │        │  extensions/*/tool.ts  │
│                          │        │  SdkSseAdapter         │
│  API Routes:             │        │  → AI SDK Stream Proto │
│  auth, vault, extensions │        └────────┬───────────────┘
│  admin, health           │                 │
│                          │        PostgreSQL + Router LLM
│  extensions/*/ui/page.tsx│          + Memory API (:18766)
│  lib/db.ts + guardrails  │
└──────────────────────────┘
```

## Fazy implementacji

### Faza 1: Bootstrap + Chat (dni 1-3)

**Dzień 1: Projekt bazowy Next.js + Pi Agent**

- [ ] `cd next && npx create-next-app@latest . --typescript --tailwind --eslint --app`
- [ ] `pnpm add ai @ai-sdk/react @ai-sdk/openai zod zustand`
- [ ] AI Elements: `npx ai-elements` → Conversation, Message, PromptInput, Shimmer, Sources, Reasoning, Tool, InlineCitation, Plan, Task, Artifact
- [ ] shadcn/ui: `npx shadcn@latest add sidebar button input sheet dialog dropdown-menu avatar`
- [ ] `agent/package.json` z Express, Pi SDK, pg, jsonwebtoken, cors
- [ ] `agent/src/index.ts` — Express server na :4000, CORS, JWT middleware

**Dzień 2: Pi Agent — sesje + streaming**

- [ ] `agent/src/session.ts` — TenantSessionPool (Map<tenantId, AgentSession>)
- [ ] `agent/src/providers.ts` — Router LLM registered in Pi SDK ModelRegistry
- [ ] `agent/src/PiAgentService.ts` — stream(), extensions loader, system prompt
- [ ] `agent/src/SdkSseAdapter.ts` — Pi SDK events → AI SDK Stream Protocol (200 linii)
- [ ] `agent/src/index.ts` — `POST /api/chat/stream` endpoint
- [ ] Test: `curl POST /api/chat/stream → odbiera SSE z protokołem AI SDK`

**Dzień 3: Frontend Chat**

- [ ] `next/app/page.tsx` — Chat z `useChat()` + `DefaultChatTransport({ api: 'http://localhost:4000/api/chat/stream' })`
- [ ] AI Elements: Conversation, Message, PromptInput, Attachments
- [ ] Tool calls: AI Elements Tool component
- [ ] Reasoning: AI Elements Reasoning component
- [ ] Shimmer podczas streamowania
- [ ] Weryfikacja: user pisze → stream → odpowiedź z formatowaniem

### Faza 2: Auth + Sidebar + Vault + Projekty (dni 4-8)

**Dzień 4: Auth + Guardrails**

- [ ] `next/lib/auth.ts` — JWT sign/verify z starego kodu
- [ ] `next/app/auth/sign-in/page.tsx` — logowanie
- [ ] `next/app/auth/sign-up/page.tsx` — rejestracja
- [ ] `next/middleware.ts` — JWT verification na chronione ścieżki
- [ ] `next/lib/guardrails/` — InjectionDetector, RateLimiter, AuditLogger z starego kodu
- [ ] `next/stores/` — Zustand: auth-store, ui-store
- [ ] Weryfikacja: login → JWT → redirect do chat → auth działa

**Dzień 5: Sidebar + Layout**

- [ ] `next/app/(dashboard)/layout.tsx` — główny layout z shadcn/ui SidebarProvider
- [ ] `next/components/layout/app-sidebar.tsx` — Sidebar: projekty, chat, vault, settings
- [ ] `next/stores/chat-store.ts` — Zustand: sesje, aktywna sesja per projekt
- [ ] `next/lib/store.ts` — PostgreSQL pool + CRUD z starego server/src/data/
- [ ] Weryfikacja: sidebar działa

**Dzień 6: Vault + Foldery**

- [ ] `next/app/(dashboard)/vault/page.tsx` — lista plików, foldery
- [ ] `next/app/api/vault/route.ts` — upload, download, CRUD folderów
- [ ] `next/app/(dashboard)/settings/page.tsx` — ustawienia użytkownika
- [ ] Vault: tworzenie folderów, nawigacja, przenoszenie plików
- [ ] Preview: PDF, obraz, tekst
- [ ] Weryfikacja: vault działa z folderami

**Dzień 7: Projekty (Gems)**

- [ ] `next/app/(dashboard)/projects/new/page.tsx` — tworzenie projektu
- [ ] `next/app/(dashboard)/projects/[id]/page.tsx` — edycja projektu: instructions, dokumenty, extensions
- [ ] `next/app/api/projects/route.ts` — CRUD projektów
- [ ] `next/stores/tenant-store.ts` — aktywny projekt w Zustand
- [ ] `next/components/layout/project-selector.tsx` — przełącznik projektów w sidebarze
- [ ] Pi Agent: AgentSession ładuje instrukcje projektu + dokumenty
- [ ] Weryfikacja: przełączenie projektu zmienia kontekst agenta

**Dzień 8: Dynamiczny Sidebar z Extensionów**

- [ ] `next/app/api/extensions/route.ts` — CRUD extensionów w DB
- [ ] `next/stores/extensions-store.ts` — Zustand: extensions[], sidebarItems[]
- [ ] `next/components/layout/extension-sidebar.tsx` — dynamiczne zakładki z manifestów
- [ ] `next/app/ext/[name]/page.tsx` — dynamiczna strona dla extensionów
- [ ] Pi Agent: endpoint `GET /api/extensions/:tenantId` — lista tool definitions
- [ ] Weryfikacja: dodanie extensionu do DB → sidebar pokazuje zakładkę

### Faza 3: RAG + Deep Research (dni 9-12)

**Dzień 9: RAG / Knowledge Base**

- [ ] `next/lib/services/rag.ts` — pipeline: chunk → embed → search (z starego RAGService.ts)
- [ ] `next/app/api/kb/route.ts` — dokumenty projektu → chunk → embed → pgvector
- [ ] Końcówka Router LLM embeddings endpoint (lub lokalny model)
- [ ] Chunkowanie: 1000 znaków, 200 overlap (konfigurowalne)
- [ ] Semantic search: cosine similarity w pgvector, top-10 chunki
- [ ] Weryfikacja: upload dokumentu → agent cytuje źródła w odpowiedzi

**Dzień 10: RAG w czacie**

- [ ] Pi Agent: przed każdym requestem → search_kb(projectId, userMessage) → inject chunków do system prompt
- [ ] AI Elements Sources + InlineCitation renderują źródła z RAG
- [ ] Per-project namespace w pgvector
- [ ] Weryfikacja: user pyta o dokument → agent odpowiada z cytowaniem

**Dzień 11: Deep Research**

- [ ] `tool: deep_research` w Pi SDK — tool do wieloetapowego researchu
- [ ] Agent planuje kroki: `pi-subagents` lub własny loop
- [ ] Każdy krok: web_search → extract → summarize
- [ ] AI Elements Plan: wyświetla plan researchu
- [ ] AI Elements Task: postęp każdego kroku
- [ ] Końcowy raport jako Artifact
- [ ] Weryfikacja: "Zbadaj rynek" → agent planuje, szuka, raportuje

**Dzień 12: Deep Research UI**

- [ ] Progress tracker w czacie (Plan + Task components)
- [ ] Źródła w raporcie (Sources + InlineCitation)
- [ ] Eksport raportu (PDF/MD)
- [ ] Weryfikacja: pełny flow research → plan → kroki → raport

### Faza 4: Extension Library + Admin (dni 13-15)

**Dzień 13: Document Service + Default Tools**

- [ ] DocumentService: `npm install pdfkit docx exceljs marked`
- [ ] `next/lib/services/document.ts` — przepisać PDF z `pdfkit` (2 dni)
- [ ] DOCX z `docx` (npm) — tabele, style, nagłówki
- [ ] XLSX z `exceljs` — arkusze, formatowanie komórek
- [ ] HTML converter: `marked` zamiast ręcznego regex
- [ ] Markdown: reuse z starego kodu (typy, sanitizacja, file saving)
- [ ] `extensions/core/vision/tool.ts` — Vision tool (`pi-ocr`)
- [ ] `extensions/core/web-search/tool.ts` — Web Search tool (`pi-web-access`)
- [ ] `extensions/core/document-gen/tool.ts` — Document Gen tool (4 formaty)
- [ ] `extensions/core/memory/tool.ts` — Memory tool
- [ ] `extensions/_registry.ts` — auto-import wszystkich tool.ts
- [ ] Pi Agent: loadTenantExtensions() ładuje tool.ts z extensions/
- [ ] Weryfikacja: agent generuje PDF, DOCX, XLSX, MD

**Dzień 14: Admin Dashboard**

- [ ] `next/app/admin/page.tsx` — Overview dashboard
- [ ] `next/app/admin/extensions/page.tsx` — Extension Manager (lista, włącz/wyłącz dla userów)
- [ ] `next/app/admin/requests/page.tsx` — Extension Request Queue
- [ ] `next/app/api/admin/route.ts` — Admin API endpoints
- [ ] Agent Monitor: z Pi SDK event listenera → dashboard pokazuje sesje
- [ ] Weryfikacja: admin może zobaczyć statystyki, zarządzać extensionami

**Dzień 15: Extension Request Flow + Deploy**

- [ ] Extension Request: user mówi "potrzebuję X" → tool `ubek_request_extension` zapisuje do DB
- [ ] Admin widzi zgłoszenie w dashboardzie
- [ ] Admin buduje extension (tworzy directory z tool.ts + page.tsx)
- [ ] Admin przypisuje extension do usera
- [ ] User widzi nową zakładkę w sidebarze
- [ ] Testy E2E: Playwright dla głównego flow
- [ ] Testy jednostkowe: Pi Agent services, SdkSseAdapter, guardrails
- [ ] `.env` — kompletna konfiguracja zmiennych środowiskowych
- [ ] Deploy test na Contabo VPS
- [ ] Weryfikacja: `pm2 start pm2.config.js` → oba procesy działają, chat streamuje

## Lista plików do przeniesienia z starego kodu

### Bez zmian (czysta logika → next/lib/):
- `server/src/data/db.ts` → `next/lib/db.ts`
- `server/src/data/store.pg.ts` → `next/lib/store.ts`
- `server/src/guardrails/injectionDetector.ts` → `next/lib/guardrails/injection-detector.ts`
- `server/src/guardrails/RateLimiter.ts` → `next/lib/guardrails/rate-limiter.ts`
- `server/src/guardrails/AuditLogger.ts` → `next/lib/guardrails/audit-logger.ts`
- `server/src/guardrails/validation.ts` → `next/lib/guardrails/validation.ts`
- `server/src/guardrails/types.ts` → `next/lib/guardrails/types.ts`
- `server/src/services/MemoryService.ts` → `next/lib/services/memory.ts`
- `server/src/services/RAGService.ts` → `next/lib/services/rag.ts`
- `server/src/services/DocumentService.ts` → `next/lib/services/document.ts`
- `server/src/services/RedisService.ts` → `next/lib/services/redis.ts`

### Z adaptacją (Express → Next.js):
- `server/src/middleware/auth.ts` (JWT signToken, verifyToken) → `next/lib/auth.ts`
- `server/src/guardrails/chatGuard.ts` → Next.js middleware wrapper
- `server/src/guardrails/guardrailsMiddleware.ts` → Next.js middleware wrapper
- `server/src/config/sdk-providers.ts` → `agent/src/providers.ts`
- `server/src/config.ts` → `agent/src/config.ts`

### Do agent/ (Pi Agent Express):
- `server/src/services/PiAgentService.ts` (stream, loadTenantExtensions, TenantSessionPool) → `agent/src/PiAgentService.ts`
- `server/src/services/SdkSseAdapter.ts` (adaptacja do AI SDK Stream Protocol) → `agent/src/SdkSseAdapter.ts`
- `server/src/config/sdk-providers.ts` (Router LLM provider) → `agent/src/providers.ts`
- `server/src/config.ts` (getRouterApiKey) → `agent/src/config.ts`

### Frontend (NIE bierzemy — piszemy od zera):
- Wszystkie AI Elements wrappery → zastąpione przez AI Elements
- Wszystkie chat komponenty → zastąpione przez AI Elements
- Wszystkie hooks → zastąpione przez @ai-sdk/react
- Wszystkie stores → przepisane pod AI SDK v6
- Wszystkie lib/api → zastąpione przez DefaultChatTransport

## Zależności npm

### next/package.json (frontend):
```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "ai": "^6",
    "@ai-sdk/react": "^1",
    "@ai-sdk/openai": "^2",
    // AI Elements instalowane przez npx ai-elements@latest (komponenty jako kod)
    "zustand": "^5",
    "zod": "^3",
    "jsonwebtoken": "^9",
    "pg": "^8",
    "ioredis": "^5",
    "bcryptjs": "^2",
    "lucide-react": "^0",
    "clsx": "^2",
    "tailwind-merge": "^3",
    "class-variance-authority": "^0.7"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/jsonwebtoken": "^9",
    "@types/pg": "^8",
    "typescript": "^5",
    "tailwindcss": "^4",
    "vitest": "^3",
    "@playwright/test": "^1"
  }
}
```

### agent/package.json (Pi Agent):
```json
{
  "dependencies": {
    "express": "^5",
    "@earendil-works/pi-coding-agent": "^0.75",
    "pg": "^8",
    "jsonwebtoken": "^9",
    "zod": "^3",
    "cors": "^2"
  },
  "devDependencies": {
    "@types/express": "^5",
    "@types/cors": "^2",
    "@types/jsonwebtoken": "^9",
    "tsx": "^4",
    "typescript": "^5",
    "vitest": "^3"
  }
}
```

## Krytyczne ścieżki implementacji

1. **SdkSseAdapter** (~200 linii) — najważniejszy plik. Mapa Pi SDK events → AI SDK Stream Protocol. 
   Bez tego useChat nie rozumie Pi Agenta.

2. **TenantSessionPool** — musi działać w procesie Express (long-lived). Map<tenantId, session>.
   Weryfikacja izolacji: user A i user B mają oddzielne sesje.

3. **DefaultChatTransport** — konfiguracja `api: 'http://localhost:4000/api/chat/stream'` i `headers`.
   Bez CORS, jeden hop (Next.js → Pi Agent).

4. **Extension Registry** — `_registry.ts` auto-importuje wszystkie tool.ts.
   Prosty mechanizm ale kluczowy dla skalowalności.

5. **AI Elements import** — `npx ai-elements` dodaje komponenty. Weryfikacja z AI SDK v6.

## Gotowość

Po zakończeniu tych 4 faz (15 dni):
- User może się zalogować i rozmawiać z agentem
- Agent ma default tools: web search, vision, document gen (PDF/DOCX/XLSX/MD), memory
- User może tworzyć projekty z custom instructions + dokumentami (RAG)
- User może uruchomić Deep Research (wieloetapowy research z raportem)
- Vault z folderami i preview plików
- Pełna historia rozmów (JSONB per chat, resumable streams)
- Memory 4-warstwowa: chat + Memory API + RAG + Projekty
- Admin może budować i przypisywać extensiony (per user + per project)
- Pi Agent działa jako osobny proces z długożyciowymi sesjami
- Frontend używa AI SDK v6 + AI Elements
- RAG pipeline z semantic search i cytowaniem
- Deploy na PM2 z dwoma procesami
