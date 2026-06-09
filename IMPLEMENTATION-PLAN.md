# Plan Implementacji — UBEK Next

## Architektura

```
Next.js 15 (:3000)                    Pi Agent Express (:4000)
┌──────────────────────────┐        ┌────────────────────────┐
│  AI Elements + shadcn/ui │        │  Pi SDK AgentSession   │
│  useChat()               │  SSE   │  AgentSessionRuntime  │
│  DefaultChatTransport    │ ◄───── │  (per-project session)│
│  → /api/chat/stream      │ proxy  │  SKILL.md per project  │
│                          │        │  extensions/*/tool.ts  │
│  API Routes:             │        │  SdkSseAdapter (fixes)│
│  /api/chat/stream (proxy)│        │  → AI SDK Stream Proto │
│  auth, vault, extensions │        └────────┬───────────────┘
│  admin, health           │                 │
│                          │        PostgreSQL + Router LLM
│  extensions/*/ui/page.tsx│          (:18881, istnieje)
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

- [ ] `agent/src/session.ts` — UserSessionPool (Map<userId, AgentSessionRuntime>), per-project sessions via switchSession()
- [ ] `agent/src/providers.ts` — Router LLM registration w Pi SDK ModelRegistry (ISTNIEJE w ubek/server/src/config/sdk-providers.ts)
- [ ] `agent/src/PiAgentService.ts` — stream(), extensions loader, system prompt (ISTNIEJE 982 linii, wymaga refaktora → split na mniejsze pliki)
- [ ] `agent/src/SdkSseAdapter.ts` — Pi SDK events → AI SDK Stream Protocol (ISTNIEJE 128 linii, wymaga naprawy: brak text-end, [DONE], error event)
- [ ] `agent/src/utils/sse.ts` — AI SDK Stream Protocol helpers (ISTNIEJE 157 linii, do skopiowania)
- [ ] `agent/src/index.ts` — `POST /api/chat/stream` endpoint
- [ ] Test: `curl POST /api/chat/stream → odbiera SSE z protokołem AI SDK`

**Dzień 3: Frontend Chat**

- [ ] `next/app/page.tsx` — Chat z `useChat()` + `DefaultChatTransport({ credentials: 'include', streamProtocol: 'data' })` → `/api/chat/stream` (Next.js proxy)
- [ ] AI Elements: Conversation, Message, PromptInput, Attachments
- [ ] Tool calls: AI Elements Tool component
- [ ] Reasoning: AI Elements Reasoning component
- [ ] Shimmer podczas streamowania
- [ ] Weryfikacja: user pisze → stream → odpowiedź z formatowaniem

### Faza 2: Auth + Sidebar + Vault + Projekty (dni 4-8)

**Dzień 4: Auth + Guardrails**

- [ ] `next/lib/auth.ts` — JWT sign/verify z starego kodu
- [ ] `next/app/auth/sign-in/page.tsx` — logowanie z httpOnly cookie
- [ ] `next/app/auth/sign-up/page.tsx` — rejestracja
- [ ] `next/middleware.ts` — JWT verification na chronione ścieżki
- [ ] `next/lib/guardrails/` — port z starego kodu: InjectionDetector, RateLimiter, AuditLogger, validation (Zod schemas)
- [ ] `next/stores/` — Zustand: auth-store, ui-store
- [ ] Weryfikacja: login → JWT (httpOnly cookie) → redirect do chat → auth działa
- [ ] `@aliou/pi-guardrails` — Phase 2 (nie w Phase 1)

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
- [ ] `next/stores/project-store.ts` — aktywny projekt w Zustand
- [ ] `next/components/layout/project-selector.tsx` — przełącznik projektów w sidebarze
- [ ] Pi Agent: AgentSession ładuje instrukcje projektu + dokumenty
- [ ] Weryfikacja: przełączenie projektu zmienia kontekst agenta

**Dzień 8: Dynamiczny Sidebar z Extensionów**

- [ ] `next/app/api/extensions/route.ts` — CRUD extensionów w DB
- [ ] `next/stores/extensions-store.ts` — Zustand: extensions[], sidebarItems[]
- [ ] `next/components/layout/extension-sidebar.tsx` — dynamiczne zakładki z manifestów
- [ ] `next/app/ext/[name]/page.tsx` — dynamiczna strona dla extensionów
- [ ] Pi Agent: endpoint `GET /api/extensions?projectId=X` — lista tool definitions
- [ ] Weryfikacja: dodanie extensionu do DB → sidebar pokazuje zakładkę

### Faza 3: RAG + Deep Research (dni 9-12)

**Dzień 9: RAG / Knowledge Base**

- [ ] `next/lib/services/rag.ts` — pipeline: chunk → embed → search (cosine similarity w TS, bez pgvector dla Phase 1)
- [ ] `next/app/api/kb/route.ts` — dokumenty projektu → chunk → embed → PostgreSQL
- [ ] Embeddings przez Router LLM embeddings endpoint
- [ ] Chunkowanie: 1000 znaków, 200 overlap (konfigurowalne)
- [ ] Semantic search: cosine similarity w TypeScript, top-10 chunki
- [ ] Weryfikacja: upload dokumentu → agent cytuje źródła w odpowiedzi

**Dzień 10: RAG w czacie**

- [ ] Pi Agent: przed każdym requestem → search_kb(projectId, userMessage) → inject chunków do system prompt
- [ ] AI Elements Sources + InlineCitation renderują źródła z RAG
- [ ] Per-project namespace w PostgreSQL (prosta tabela rag_chunks bez pgvector)
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
- [ ] Pi Agent: loadUserExtensions() ładuje tool.ts z extensions/
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

> Po przeglądzie jakości: **10 port, 4 port + clean, 5 rewrite, 0 skip całkowicie**

### PORT 1:1 (czysta logika, bez zmian):
- `server/src/data/db.ts` → `next/lib/db.ts`
- `server/src/guardrails/RateLimiter.ts` → `next/lib/guardrails/rate-limiter.ts`
- `server/src/guardrails/AuditLogger.ts` → `next/lib/guardrails/audit-logger.ts`
- `server/src/guardrails/types.ts` → `next/lib/guardrails/types.ts`
- `server/src/services/RedisService.ts` → `next/lib/services/redis.ts`
- `server/src/services/MemoryService.ts` → `next/lib/services/memory.ts`
- `server/src/utils/sse.ts` → `agent/src/utils/sse.ts`
- `server/src/services/SdkSseAdapter.ts` → `agent/src/SdkSseAdapter.ts` (wymaga fixów)
- `server/src/config/sdk-providers.ts` → `agent/src/providers.ts`
- `server/src/config.ts` → `agent/src/config.ts`

### PORT + CZYŚCENIE (wyciągnąć logikę, middleware od nowa):
- `server/src/guardrails/injectionDetector.ts` → `next/lib/guardrails/injection-detector.ts` (tylko klasa InjectionDetector)
- `server/src/guardrails/validation.ts` → `next/lib/guardrails/validation.ts` (tylko Zod schemas)
- `server/src/middleware/auth.ts` → `next/lib/auth.ts` (tylko signToken/verifyToken)
- `server/src/services/RAGService.ts` → `next/lib/services/rag.ts` (split na chunker/embedder/searcher)

### REWRITE (nie przenosimy — piszemy od nowa):
- `server/src/data/store.pg.ts` → `next/lib/store.ts` (nowy schemat: users/projects/sessions/vault/extensions)
- `server/src/services/DocumentService.ts` → `next/lib/services/document.ts` (pdfkit/docx/exceljs zamiast fake PDF)
- `server/src/services/PiAgentService.ts` → `agent/src/PiAgentService.ts` (split: session.ts + registry.ts + stream.ts)
- `server/src/guardrails/chatGuard.ts` → `next/lib/guardrails/` (middleware pod Next.js)
- `server/src/guardrails/guardrailsMiddleware.ts` → `next/lib/guardrails/` (middleware pod Next.js)

### SKIP (całkowicie od nowa):
- Wszystkie pliki frontend (stary) → AI SDK v6 + AI Elements

> **Uwaga:** Schemat DB jest nowy (bez tenants/channels/stripe). Store pisany od nowa z typami i user_id zamiast tenant_id.

## Zależności npm

### next/package.json (frontend):
```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "ai": "^6",
    "@ai-sdk/react": "^3",
    "@ai-sdk/openai": "^2",
    "zustand": "^5",
    "zod": "^3",
    "jsonwebtoken": "^9",
    "pg": "^8",
    "drizzle-orm": "^0.46",
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
    "drizzle-kit": "^0.31",
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
    "@earendil-works/pi-coding-agent": "0.75.2",
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

## Wymagane fixy zweryfikowane przeciwko kodowi

### SdkSseAdapter — 5 krytyczne braki (POTWIERDZONE w kodzie)
1. **Brak `start`**: `sendAISDKStart()` istnieje w `sse.ts:82` ale **nigdy nie jest wywoływana** w adapterze. AI SDK v6 wymaga `{ type: 'start', messageId }` jako pierwszego eventu w streamie.
2. **Brak `text-end`**: `sendAISDKTextEnd()` istnieje w `sse.ts:96` ale **nigdy nie jest wywoływana** w adapterze. AI Elements nie zakończy bloku tekstu → shimmer widoczny permanentnie.
3. **Brak `reasoning-end`**: Adapter wysyła `reasoning-delta` ale nigdy nie wysyła `sendAISDKReasoningEnd()`.
4. **Brak `[DONE]`**: `sendAISDKFinish()` wysyła tylko `{ type: 'finish' }` + `res.end()`. AI SDK v6 oczekuje `data: [DONE]\n\n` jako osobny event przed `finish`.
5. **Brak `error` event**: Event handler nie ma case dla error. Event `error` z Pi SDK jest ignorowany — użytkownik nie dostanie informacji o błędzie.

### Security — zweryfikowane luki
1. **CSRF**: `/api/chat/stream` przyjmuje httpOnly cookie — potrzebny double-submit token lub Origin header check
2. **AGENT_API_KEY**: brak shared secret między Next.js a Pi Agentem — każdy z JWT może direct POSTować na :4000
3. **Pi Agent bind**: Express domyślnie `0.0.0.0` — wymagane `127.0.0.1`
4. **XSS**: LLM output wysyłany do AI Elements bez sanitizacji — potrzebny `dompurify`

### DB Schema — zweryfikowane problemy
1. **`users.id`**: zmienić TEXT na UUID, spójność z nowym schematem
2. **Brak FK indexes**: `project_extensions(extension_id)`, `extension_requests(user_id)`, `rag_chunks(file_id)`
3. **`rag_chunks.updated_at`**: dodać kolumnę dla debugowania
4. **`vault_files` indexes**: brak `idx_vault_created_at` dla sortowania

### Frontend — zweryfikowane problemy
1. **`credentials: 'include'`**: `DefaultChatTransport` przy absolutnym URL nie dodaje credentials automatycznie
2. **`streamProtocol: 'data'`**: wymagane explicite (domyślnie 'text')
3. **SSR**: AI Elements PromptInput wymaga `dynamic()` z `ssr: false`

## Krytyczne ścieżki implementacji

1. **SdkSseAdapter** (128 linii, istnieje) — najważniejszy plik. Mapa Pi SDK events → AI SDK Stream Protocol.
   **Wymaga naprawy:** brak `text-end`, brak `[DONE]`, brak `error` event. Bez tych fixów useChat może nie działać poprawnie z AI Elements.

2. **Session model** — per-project sessions przez AgentSessionRuntime (nie per-user).
   `switchSession()` tworzy nową AgentSession dla każdego projektu. 1 runtime per user.

3. **DefaultChatTransport** — konfiguracja `credentials: 'include'` i `streamProtocol: 'data'`.
   Dwa hop-y: Browser → Next.js `/api/chat/stream` (ten sam origin, httpOnly cookie auto) → Pi Agent `localhost:4000/api/chat/stream` (Authorization: Bearer + AGENT_API_KEY). Zero CORS w produkcji.

4. **PiAgentService** (982 linii, istnieje) — wymaga refaktora: split na mniejsze pliki (session pool, tools, system prompt).

5. **Extension Registry** — `_registry.ts` auto-importuje wszystkie tool.ts. Istniejący wzór z starego kodu.

6. **AI Elements import** — `npx ai-elements` dodaje komponenty. Weryfikacja z AI SDK v6.

## Gotowość

Po zakończeniu tych 4 faz (15 dni):
- User może się zalogować i rozmawiać z agentem
- Agent ma default tools: web search, vision, document gen (PDF/DOCX/XLSX/MD), memory
- User może tworzyć projekty z custom instructions + dokumentami (RAG)
- User może uruchomić Deep Research (wieloetapowy research z raportem)
- Vault z folderami i preview plików
- Pełna historia rozmów (JSONB per chat, resumable streams)
- Memory 3-warstwowa: chat (JSONB) + RAG + Projekty (user_facts w PostgreSQL dla Phase 1)
- Admin może budować i przypisywać extensiony (per user + per project)
- Pi Agent działa jako osobny proces z długożyciowymi sesjami
- Frontend używa AI SDK v6 + AI Elements
- RAG pipeline z semantic search i cytowaniem
- Deploy na PM2 z dwoma procesami
