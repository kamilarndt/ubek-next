# UBEK Next — Architecture

## Overview

Dwa procesy: Next.js 15 (frontend + API) + Pi Agent Express (agent engine + streaming).
Komunikacja przez AI SDK Stream Protocol (HTTP SSE). Zero CORS, auth przez JWT.

```
                    ┌─────────────────────────────────────────┐
                    │  Next.js 15 (:3000)                     │
                    │  ┌─────────────────────────────────┐    │
                    │  │ AI Elements + shadcn/ui          │    │
                    │  │ useChat()                        │    │
                    │  │   DefaultChatTransport           │    │
                    │  │   → http://localhost:4000        │    │
                    │  ├─────────────────────────────────┤    │
                    │  │ API Routes:                      │    │
                    │  │   /api/auth/*      ← JWT          │    │
                    │  │   /api/vault/*     ← pliki       │    │
                    │  │   /api/extensions  ← extensiony  │    │
                    │  │   /api/admin/*     ← dashboard   │    │
                    │  │   /api/health      ← status     │    │
                    │  ├─────────────────────────────────┤    │
                    │  │ extensions/*/ui/page.tsx          │    │
                    │  │ lib/db.ts + lib/guardrails/       │    │
                    │  │ stores/ (Zustand)                │    │
                    │  └─────────────────────────────────┘    │
                    └──────────────────┬──────────────────────┘
                                       │ HTTP SSE
                          AI SDK Stream Protocol
                                       │
                    ┌──────────────────┴──────────────────────┐
                    │  Pi Agent Express (:4000)               │
                    │  ┌─────────────────────────────────┐    │
                    │  │ POST /api/chat/stream            │    │
                    │  │   → PiAgentService.stream()      │    │
                    │  │   → TenantSessionPool            │    │
                    │  │   → AgentSession (Pi SDK)        │    │
                    │  │   → tools z extensions/*/tool.ts │    │
                    │  │   → Router LLM (:18881)          │    │
                    │  │   → SdkSseAdapter                │    │
                    │  │   → AI SDK Stream Protocol       │    │
                    │  │   → SSE response                 │    │
                    │  └─────────────────────────────────┘    │
                    └──────────────────┬──────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
  PostgreSQL (:5433)           Router LLM (:18881)           Memory API (:18766)
  + pgvector                    multi-provider gateway       Python FastAPI
  tenants, users,               → model inference            memory storage
  sessions, vault,              → tool calling               + pgvector embeddings
  extensions, kb                → streaming
```

## Services & ports

| Service | Port | Uruchamianie |
|---------|------|-------------|
| Frontend (Next.js 15) | 3000 | `npm run dev` w `next/` |
| Pi Agent (Express) | 4000 | `npx tsx src/index.ts` w `agent/` |
| Memory API (FastAPI) | 18766 | external — z poprzedniego projektu |
| Router LLM | 18881 | external — multi-provider gateway |
| PostgreSQL | 5433 | local lub Docker |

## Core Flows

### Chat Flow
1. Użytkownik pisze wiadomość w PromptInput (AI Elements)
2. `useChat()` z `DefaultChatTransport` wysyła POST do `http://localhost:4000/api/chat/stream`
3. Pi Agent Express odbiera request, weryfikuje JWT
4. `TenantSessionPool.getOrCreate(tenantId)` zwraca lub tworzy AgentSession
5. AgentSession ładuje tool-e z `extensions/*/tool.ts` dla danego tenant
6. Pi SDK wykonuje AgentSession.processMessage() → Router LLM → tool calling → streaming
7. SdkSseAdapter mapuje Pi SDK events → AI SDK Stream Protocol (data: {type: "text-delta", ...})
8. useChat() odbiera SSE i renderuje przez AI Elements (Conversation, Message, Tool)

### Extension Flow
1. Admin tworzy katalog w `next/extensions/{name}/` z `tool.ts` + `manifest.json` + opcjonalnie `ui/page.tsx`
2. Pi Agent przy starcie ładuje `extensions/core/*/tool.ts` przez `_registry.ts`
3. Admin przypisuje extension do usera przez Admin Dashboard (zapis w PostgreSQL)
4. Przy session.getOrCreate(), Pi Agent ładuje tool-e tylko dla aktywnego tenant
5. Frontend fetchuje `GET /api/extensions?tenantId=X` → lista manifestów → dynamiczny sidebar
6. User widzi zakładkę → klik → `ext/{name}/page.tsx` → React component extensionu

### Auth Flow
1. User rejestruje się → POST /api/auth/sign-up → bcrypt hash → INSERT do DB → JWT
2. User loguje się → POST /api/auth/sign-in → verify password → zwraca JWT
3. Next.js middleware sprawdza JWT na każdej chronionej ścieżce
4. Pi Agent weryfikuje JWT z `Authorization` header na każdym requeście
5. Wspólny sekret JWT między Next.js a Pi Agentem

## Key Architecture Decisions

| Decyzja | Wybór | Uzasadnienie |
|---------|-------|-------------|
| Procesy | 2 (Next.js + Pi Agent) | Izolacja: crash Pi SDK nie zabija frontendu. Sesje w pamięci long-lived |
| Streaming | AI SDK Stream Protocol | useChat rozumie natywnie. Zero custom transportu |
| Pi SDK | W osobnym procesie Express | Long-lived = sesje trwają. Fault isolation |
| Extensions | file-based .ts + manifest.json | Prostota Fazy 1. MCP w Fazie 3 |
| Auth | JWT (wspólny sekret) | Bez zewnętrznych zależności. Działa w dwóch procesach |
| Frontend | AI SDK v6 + AI Elements | Zero własnych wrapperów. Vendor-supported |
| DB | PostgreSQL + pgvector | Sprawdzone w poprzednim projekcie |
| JWT storage | httpOnly cookie (secure) | Bezpieczniejsze niż localStorage — chroni przed XSS |
| ID kolumny | tenant_id (1 tenant = 1 user w Phase 1) | Spójność w całej aplikacji |
| Memory | Python FastAPI (:18766) | Działa, zero ryzyka na starcie |

## Tenant Isolation

- `TenantSessionPool` — `Map<tenantId, AgentSession>` — każdy user ma osobną sesję Pi SDK
- `WHERE tenant_id = ?` — na każdym zapytaniu SQL
- `/tmp/ubek/agents/{tenantId}/` — własny katalog agenta per tenant
- `agents/clients/{tenantId}/SKILL.md` — własny system prompt per tenant
- `loadTenantExtensions(tenantId)` — tylko wybrane extensiony dla danego usera

## Extension System

```
extensions/                       ← Wspólny katalog dostępny dla obu procesów
├── core/                          ← Zawsze aktywne (Default Tools)
│   ├── vision/tool.ts
│   ├── web-search/tool.ts
│   ├── document-gen/tool.ts
│   └── memory/tool.ts
├── social-media/                  ← Custom extension (per assignment)
│   ├── manifest.json
│   ├── tool.ts
│   └── ui/
│       ├── page.tsx
│       └── components/
└── _registry.ts                   ← Auto-import wszystkich tool.ts
```

Każdy extension to trzy rzeczy:
- `manifest.json` — metadata (name, description, icon, sidebar, route, tools[])
- `tool.ts` — rejestracja przez `pi.registerTool()` — ładowany przez Pi Agent
- `ui/page.tsx` — React component — dynamicznie importowany przez Next.js

Per-user activation: `user_extensions` tabela w PostgreSQL.
