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
- [ ] AI Elements: `npx ai-elements` → Conversation, Message, PromptInput, Shimmer, Sources, Reasoning, Tool, InlineCitation
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

### Faza 2: Auth + Sidebar + Vault (dni 4-6)

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
- [ ] `next/components/layout/app-sidebar.tsx` — Sidebar z listą chatów, przyciskiem nowej rozmowy
- [ ] `next/stores/chat-store.ts` — Zustand: sesje, aktywna sesja
- [ ] `next/app/(dashboard)/vault/page.tsx` — podstawowy Vault (lista plików, upload)
- [ ] `next/app/api/vault/route.ts` — API dla Vault
- [ ] `next/app/(dashboard)/settings/page.tsx` — ustawienia użytkownika
- [ ] `next/lib/store.ts` — PostgreSQL pool + CRUD z starego server/src/data/
- [ ] Weryfikacja: sidebar działa, vault działa, settings działa

**Dzień 6: Dynamiczny Sidebar z Extensionów**

- [ ] `next/app/api/extensions/route.ts` — CRUD extensionów w DB
- [ ] `next/stores/extensions-store.ts` — Zustand: extensions[], sidebarItems[]
- [ ] `next/components/layout/extension-sidebar.tsx` — dynamiczne zakładki z manifestów
- [ ] `next/app/ext/[name]/page.tsx` — dynamiczna strona dla extensionów
- [ ] Pi Agent: endpoint `GET /api/extensions/:tenantId` — lista tool definitions
- [ ] Weryfikacja: dodanie extensionu do DB → sidebar pokazuje zakładkę

### Faza 3: Extension Library + Admin (dni 7-9)

**Dzień 7: Extension Library**

- [ ] `next/extensions/core/vision/tool.ts` — Vision tool (pi-web-access lub własny)
- [ ] `next/extensions/core/web-search/tool.ts` — Web Search tool (registered via registry)
- [ ] `next/extensions/core/document-gen/tool.ts` — Document Gen tool
- [ ] `next/extensions/core/memory/tool.ts` — Memory tool
- [ ] `extensions/_registry.ts` — auto-import wszystkich tool.ts (współdzielony katalog)
- [ ] Pi Agent: loadTenantExtensions() ładuje tool.ts z extensions/ (relative path)
- [ ] Weryfikacja: agent ma default tools, może wyszukać w sieci

**Dzień 8: Admin Dashboard**

- [ ] `next/app/admin/page.tsx` — Overview dashboard
- [ ] `next/app/admin/extensions/page.tsx` — Extension Manager (lista, włącz/wyłącz dla userów)
- [ ] `next/app/admin/requests/page.tsx` — Extension Request Queue
- [ ] `next/app/api/admin/route.ts` — Admin API endpoints
- [ ] Agent Monitor: z Pi SDK event listenera → dashboard pokazuje sesje
- [ ] Weryfikacja: admin może zobaczyć statystyki, zarządzać extensionami

**Dzień 9: Extension Request Flow**

- [ ] Extension Request: user mówi "potrzebuję X" → tool `ubek_request_extension` zapisuje do DB
- [ ] Admin widzi zgłoszenie w dashboardzie
- [ ] Admin buduje extension (tworzy directory z tool.ts + page.tsx)
- [ ] Admin przypisuje extension do usera
- [ ] User widzi nową zakładkę w sidebarze
- [ ] Weryfikacja: pełny flow request → build → deploy → user używa

### Faza 4: Testy + Polerowanie (dzień 10)

**Dzień 10: Testy i deploy**

- [ ] Testy E2E: Playwright dla głównego flow (auth → chat → stream)
- [ ] Testy jednostkowe: Pi Agent services, SdkSseAdapter, guardrails
- [ ] Testy komponentów: AI Elements, sidebar, stores
- [ ] `pm2.config.js` — konfiguracja PM2 dla dwóch procesów
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
    "@ai-elements/chat": "^1",
    "@ai-elements/code": "^1",
    "@ai-elements/workflow": "^1",
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

Po zakończeniu tych 4 faz:
- User może się zalogować i rozmawiać z agentem
- Agent ma default tools (web search, vision, document gen, memory)
- Admin może budować i przypisywać extensiony
- Pi Agent działa jako osobny proces z długożyciowymi sesjami
- Frontend używa AI SDK v6 + AI Elements
- Deploy na PM2 z dwoma procesami
