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
                    │  │   /api/projects/*  ← Projekty    │    │
                    │  │   /api/kb/*        ← RAG/KB      │    │
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
2. `useChat({ id: chatId })` → `DefaultChatTransport` → POST `http://localhost:4000/api/chat/stream`
3. Pi Agent Express odbiera request, weryfikuje JWT
4. Server ładuje poprzednie wiadomości z DB (`loadChat(chatId)` → UIMessage[])
5. Nowa wiadomość dołączona do historii
6. `TenantSessionPool.getOrCreate(tenantId)` zwraca lub tworzy AgentSession
7. AgentSession ładuje kontekst projektu: instrukcje + RAG chunk-i + memory + tool-e
8. `validateUIMessages()` — walidacja zgodności tool schemas
9. Pi SDK wykonuje AgentSession.processMessage() → Router LLM → tool calling → streaming
10. SdkSseAdapter mapuje Pi SDK events → AI SDK Stream Protocol (text-delta, reasoning-delta, tool-input, tool-output, finish)
11. `toUIMessageStreamResponse({ originalMessages, onFinish: ({ messages }) => saveChat({ chatId, messages }) })`
12. useChat() odbiera SSE i renderuje przez AI Elements (Conversation, Message, Tool, Sources, Reasoning)
13. `consumeSseStream` — resumable stream, response nie ginie przy disconnect

### Extension Flow
1. Admin tworzy katalog w `extensions/{name}/` z `tool.ts` + `manifest.json` + opcjonalnie `ui/page.tsx`
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
| Memory | 4 warstwy | Chat (JSONB) + Memory API + RAG + Projekty |
| Chat persistence | JSONB per chat (UIMessage[]) | AI SDK recommended, validateUIMessages() |
| Document Gen | pdfkit + docx + exceljs + marked | Nowa impl (stary placeholder) |
| Deep Research | Własna impl (nie pi-subagents) | AI Elements Plan + Task |
| RAG | Router LLM embeddings, auto + tool | top-5 chunków po 1000 zn |
| Projekty | Sidebar section, global + per-project memory | Osobna pamięć, KB, extensions per project |
| Default Tools pakiet | pi-web-access, pi-ocr | 2 gotowce z pi.dev |
| Memory API | Python FastAPI (:18766) | Działa, zero ryzyka na starcie |

## Projects (Gems)

Projekty to osobne przestrzenie robocze dla użytkownika — jak Gemini Gems lub projekty w ChatGPT.

### Koncept
- User może mieć wiele projektów (np. "Moja firma", "Klient A", "Strona WWW")
- Każdy projekt ma:
  - `name`, `description`
  - `instructions` — custom system prompt (jak Gems instructions)
  - `documents` — Knowledge Base pliki dla RAG
  - `memory` — osobna przestrzeń Memory API per projekt
  - `extensions` — które extensiony są aktywne dla projektu
- Przełączenie projektu = AgentSession dostaje inny kontekst

### Przepływ
1. User tworzy projekt → `/projects/new` → wpisuje nazwę + instrukcje
2. User dodaje dokumenty → upload do Vault → przypisane do projektu
3. User przełącza projekt → sidebar lub top-bar selector
4. AgentSession ładuje: instructions + KB (embeddings) + memory + extensions dla projektu
5. User rozmawia → agent ma kontekst projektu

### DB Schema
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  memory_namespace TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES vault_files(id),
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  extension_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  UNIQUE(project_id, extension_name)
);
```

### Agent Integration
```typescript
// AgentSession dostaje kontekst projektu przy starcie
const project = await getProject(projectId);
const kbChunks = await searchKnowledgeBase(projectId, userMessage);
const memory = await getProjectMemory(projectId);

const session = await pi.createAgentSession({
  systemPrompt: project.instructions + '\n\n' + kbChunks.join('\n'),
  tools: getProjectExtensions(projectId),
  memory: memory,
});
```

## RAG / Knowledge Base

RAG pipeline dla dokumentów w projektach i Vault.

### Pipeline
1. **Upload**: user wgrywa plik (PDF, DOCX, TXT, MD) → Vault
2. **Chunking**: dokument dzielony na chunk-i (1000 znaków, 200 overlap)
3. **Embedding**: każdy chunk embedowany przez Router LLM embeddings endpoint
4. **Storage**: embedding + chunk + metadata zapisane w pgvector
5. **Query**: user zadaje pytanie → embed query → cosine similarity search → top-10 chunków
6. **Injection**: chunk-i + źródła wstrzyknięte do promptu agenta
7. **Response**: agent odpowiada z cytowaniem źródła (source-url, source-document)

### RAG w projekcie
- Każdy projekt ma osobny namespace embeddingów w pgvector
- Query szuka tylko w dokumentach projektu + ewentualnie globalnych (Vault KB)
- Agent widzi źródła i cytuje je w odpowiedzi
- AI Elements Sources + InlineCitation renderują źródła

### Reuse
- `server/src/services/RAGService.ts` — pełny pipeline do przeniesienia do `next/lib/services/rag.ts`
- `server/src/data/store.pg.ts` — CRUD vault + KB

## Document Generation

Generowanie dokumentów w 4 formatach. Nowa implementacja (stary kod był placeholderem).

### Formaty

| Format | Biblioteka | Opis |
|--------|-----------|------|
| Markdown | własny (reuse) | Prosty `.md` z metadanymi, spisem treści |
| PDF | `pdfkit` | Profesjonalny PDF z tabelami, kodem, nagłówkami |
| DOCX | `docx` (npm) | Ważny Office Open XML, tabele, style |
| XLSX | `exceljs` | Arkusze kalkulacyjne, formatowanie komórek |

### Pipeline
1. User: "Wygeneruj raport w PDF" lub tool call `generate_document`
2. Content: markdown z odpowiedzi agenta
3. HTML converter: `marked` (zamiast regex) → HTML
4. Renderer: PDF/DOCX/XLSX biblioteka → Buffer
5. Storage: zapis do Vault (foldery projektu lub domyślny)
6. Response: link do pliku w Vault

### Reuse z starego kodu
- `DocumentService.ts` (290 linii) — ~60% do reuse
- Markdown: typy, sanitizacja, file saving → OK
- PDF: **placeholder** (`<html-converted>...`) → przepisać z `pdfkit`
- DOCX: **invalid** (surowy XML, nie ZIP) → przepisać z `docx`
- XLSX: **brak** → dodać z `exceljs`
- HTML converter: regex → `marked` lub `remark`

## Deep Research

Wieloetapowy, autonomiczny research wykonywany przez agenta z subagentami.

### Przepływ
1. User: "Zbadaj rynek konkurencji dla małych firm w Polsce"
2. Agent tworzy plan researchu: [konkurenci, ceny, opinie, trendy]
3. Dla każdego kroku: subagent + web search + synteza
4. Subagenty działają równolegle (fan-out)
5. Agent kompiluje końcowy raport
6. Wynik w czacie z Sources

### Plan implementacji
- **Phase 1**: prosty loop — agent planuje → web search dla każdego kroku → kompilacja
  - Wykorzystać `pi-subagents` (103.2K downloads) lub własną implementację
  - UI: Task/Plan component z AI Elements (progress tracker)
- **Phase 2**: zaawansowany — równoległe subagenty, arbitralna głębokość
  - Wykorzystać MCP tools + pi-subagents

### AI Elements UI
- `Plan` — wyświetla plan researchu
- `Task` — pokazuje postęp każdego kroku
- `Sources` + `InlineCitation` — źródła w raporcie
- `Artifact` — końcowy raport jako osobny dokument

## Memory Architecture

4 warstwy pamięci, każda inna odpowiedzialność:

```
Warstwa 4: Projekty (Gems)          ← per-project: instrukcje + KB + memory + extensions
Warstwa 3: RAG / Knowledge Base     ← pgvector: dokumenty → chunk → embed → search
Warstwa 2: Memory API (:18766)      ← Python FastAPI: fakty cross-session o userze
Warstwa 1: Chat persistence (JSONB) ← PostgreSQL: UIMessage[], resumable streams
```

### Warstwa 1 — Chat persistence
- Tabela: `chats` z kolumną `messages JSONB` (UIMessage[])
- `saveChat({ chatId, messages })` i `loadChat(chatId)` jak w dokumentacji AI SDK
- `onFinish` callback — zapis pełnej sesji po zakończeniu streamowania
- `validateUIMessages()` — walidacja zgodności schematów przy ładowaniu
- Resumable streams: `consumeSseStream` + Redis

### Warstwa 2 — Memory API (:18766)
- Python FastAPI + pgvector
- Fakty cross-session: "Użytkownik Kamil pracuje jako scenograf"
- Namespace: `tenantId` (global) i `projectId` (per project)
- Agent dostaje memory przy starcie sesji

### Warstwa 3 — RAG / Knowledge Base
- Dokumenty → chunk (1000 zn, 200 overlap) → embed (Router LLM) → pgvector
- Automatyczny search przed każdym requestem + tool `search_kb`
- Top-5 chunków injectowanych do promptu
- AI Elements Sources + InlineCitation

### Warstwa 4 — Projekty (Gems)
- Sidebar section: przełącznik projektów
- Per project: instructions + dokumenty (KB) + memory + extensions
- AgentSession ładuje kontekst projektu przy starcie
- User + per project extensions

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
