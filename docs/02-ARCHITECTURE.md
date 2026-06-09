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
                    │  │   → /api/chat/stream (proxy)        │    │
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
                    │  │   → UserSessionPool            │    │
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
  PostgreSQL (:5433)           Router LLM (:18881)
  users, projects,              multi-provider gateway
  sessions, vault,              → model inference
  extensions, kb,               → tool calling
  user_facts                    → streaming
  PostgreSQL (:5433)           Router LLM (:18881)
  users, projects,              multi-provider gateway
  sessions, vault,              → model inference
  extensions, kb,               → tool calling
  user_facts                    → streaming
  PostgreSQL (:5433)           Router LLM (:18881)
  users, projects,              multi-provider gateway
  sessions, vault,              → model inference
  extensions, kb,               → tool calling
  user_facts                    → streaming
  PostgreSQL (:5433)           Router LLM (:18881)
  users, projects,              multi-provider gateway
  sessions, vault,              → model inference
  extensions, kb,               → tool calling
  user_facts                    → streaming
  PostgreSQL (:5433)           Router LLM (:18881)
  users, projects,              multi-provider gateway
  sessions, vault,              → model inference
  extensions, kb,               → tool calling
  user_facts                    → streaming
  PostgreSQL (:5433)           Router LLM (:18881)
  users, projects,              multi-provider gateway
  sessions, vault,              → model inference
  extensions, kb,               → tool calling
  user_facts                    → streaming

## Database Schema (Phase 1)

```sql
-- Users (1 user = 1 konto, Phase 1)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),     -- FIX: zmienione z TEXT
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects (Gems) — osobna przestrzeń robocza
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  instructions  TEXT NOT NULL DEFAULT '',     -- system prompt / SKILL.md
  icon          TEXT NOT NULL DEFAULT 'gem',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON projects(user_id);

-- Chat sessions per project
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,           -- uuid
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Nowa rozmowa',
  messages      JSONB NOT NULL DEFAULT '[]', -- UIMessage[]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_project ON sessions(project_id);

-- Vault files
CREATE TABLE vault_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL,              -- storage filename
  original_name TEXT NOT NULL,              -- display name
  size          BIGINT NOT NULL DEFAULT 0,
  mime_type     TEXT NOT NULL DEFAULT 'application/octet-stream',
  folder        TEXT NOT NULL DEFAULT '/',  -- virtual folder path
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ                -- soft-delete
);

CREATE INDEX idx_vault_user    ON vault_files(user_id);
CREATE INDEX idx_vault_project ON vault_files(project_id);
CREATE INDEX idx_vault_created_at ON vault_files(created_at);  -- FIX: brakowało

-- Extensions registry (global, loaded at Pi Agent startup)
CREATE TABLE extensions (
  id            TEXT PRIMARY KEY,           -- 'social-media', 'vision', etc.
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  has_ui        BOOLEAN NOT NULL DEFAULT false, -- czy ma ui/page.tsx
  icon          TEXT NOT NULL DEFAULT 'puzzle',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Which extensions are enabled per project
CREATE TABLE project_extensions (
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  extension_id  TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  config        JSONB NOT NULL DEFAULT '{}', -- per-extension config (API keys etc.)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, extension_id)
);

-- FIX: brakowało indexu FK
CREATE INDEX idx_project_extensions_extension ON project_extensions(extension_id);

-- Extension requests (user → admin pipeline)
CREATE TABLE extension_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  priority      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low', 'medium', 'high')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'in_progress', 'done')),
  admin_notes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FIX: brakowało indexu FK
CREATE INDEX idx_extension_requests_user ON extension_requests(user_id);

-- RAG chunks (Phase 1: embedding as JSONB float[], Phase 2: pgvector)
-- CREATE EXTENSION IF NOT EXISTS vector;  -- Phase 2

CREATE TABLE rag_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id       UUID REFERENCES vault_files(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  content       TEXT NOT NULL,
  embedding     JSONB NOT NULL DEFAULT '[]',        -- float[] dla cosine similarity (Phase 1: JSONB, Phase 2: pgvector)
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- FIX: brakowało
);

CREATE INDEX idx_rag_project ON rag_chunks(project_id);
-- FIX: brakowało indexu FK
CREATE INDEX idx_rag_file ON rag_chunks(file_id);
-- HNSW index tworzymy po zaludnieniu danych

-- Audit log
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,              -- 'chat', 'tool_call', 'login', etc.
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_time ON audit_log(created_at);
```

> **Różnice vs stary projekt:** usunięto tabele niepotrzebne w Phase 1 (`tenants`, `agents`, `subscriptions`, `channel_configs`, `memory_vectors`, `admin_*`). Zastąpiono `tenant_id` przez `user_id`. Projekty (Gems) są nową tabelą nadrzędną dla sesji i vaultu.

## Services & ports

| Service | Port | Uruchamianie |
|---------|------|-------------|
| Frontend (Next.js 15) | 3000 | `npm run dev` w `next/` |
| Pi Agent (Express) | 4000 | `npx tsx src/index.ts` w `agent/` |
| Memory API (FastAPI) | 18766 | external — Phase 2 (dla 20 userów: user_facts tabela) |
| Router LLM | 18881 | external — multi-provider gateway |
| PostgreSQL | 5433 | local lub Docker |

## Core Flows

### Chat Flow
1. Użytkownik pisze wiadomość w PromptInput (AI Elements)
2. `useChat({ id: chatId })` → `DefaultChatTransport({ streamProtocol: 'data', credentials: 'include' })` → POST `/api/chat/stream` (Next.js proxy, ten sam origin)
3. Next.js API Route wyciąga JWT z httpOnly cookie, dodaje `Authorization: Bearer` + `AGENT_API_KEY` header
4. Forward do `localhost:4000/api/chat/stream`
5. Pi Agent Express odbiera request, weryfikuje JWT + AGENT_API_KEY
6. Server ładuje poprzednie wiadomości z DB (`loadChat(chatId)` → UIMessage[])
7. Nowa wiadomość dołączona do historii
8. `UserSessionPool.getRuntime(userId)` → `AgentSessionRuntime`
9. `runtime.switchSession(projectFile, { resourceLoader, tools })` → nowa AgentSession per projekt
10. AgentSession ładuje kontekst projektu: instrukcje + RAG chunk-i + memory + tool-e
11. `validateUIMessages()` — walidacja zgodności tool schemas
12. Pi SDK wykonuje `session.prompt(text)` → Router LLM → tool calling → streaming
13. SdkSseAdapter mapuje Pi SDK events → AI SDK Stream Protocol (text-start, text-delta, text-end, reasoning-delta, reasoning-end, tool-input-available, tool-output-available, finish, [DONE])
14. `onFinish` → zapis do DB (`saveChat({ chatId, messages })`)
15. useChat() odbiera SSE i renderuje przez AI Elements (Conversation, Message, Tool, Sources, Reasoning)

### Extension Flow
1. Admin tworzy katalog w `extensions/{name}/` z `tool.ts` + `manifest.json` + opcjonalnie `ui/page.tsx`
2. Pi Agent przy starcie ładuje `extensions/core/*/tool.ts` przez `_registry.ts`
3. Admin przypisuje extension do usera przez Admin Dashboard (zapis w PostgreSQL)
4. Przy session.getOrCreate(), Pi Agent ładuje tool-e tylko dla aktywnego projektu
5. Frontend fetchuje `GET /api/extensions?projectId=X` → lista manifestów → dynamiczny sidebar
6. User widzi zakładkę → klik → `ext/{name}/page.tsx` → React component extensionu

### Auth Flow
1. User rejestruje się → POST /api/auth/sign-up → bcrypt hash → INSERT do DB → JWT
2. User loguje się → POST /api/auth/sign-in → verify password → zwraca JWT
3. Next.js middleware sprawdza JWT na każdej chronionej ścieżce
4. Pi Agent weryfikuje JWT z `Authorization` header na każdym requeście
5. Wspólny sekret JWT między Next.js a Pi Agentem
6. **CSRF protection**: SameSite=Strict cookie + double-submit token na mutacyjnych endpointach
7. **AGENT_API_KEY**: shared secret między Next.js a Pi Agentem (Next.js dodaje header przy proxy)

## Key Architecture Decisions

| Decyzja | Wybór | Uzasadnienie |
|---------|-------|-------------|
| Procesy | 2 (Next.js + Pi Agent) | Izolacja: crash Pi SDK nie zabija frontendu. Sesje w pamięci long-lived |
| Streaming | AI SDK Stream Protocol | useChat rozumie natywnie. Zero custom transportu |
| Pi SDK | W osobnym procesie Express | Long-lived = sesje trwają. Fault isolation |
| Extensions | file-based .ts + manifest.json | Prostota Fazy 1. MCP w Fazie 3 |
| Auth | JWT (wspólny sekret) | Bez zewnętrznych zależności. Działa w dwóch procesach |
| Frontend | AI SDK v6 + AI Elements | Zero własnych wrapperów. Vendor-supported |
| DB | PostgreSQL + cosine similarity w TS | Proste dla Phase 1 (20 userów), pgvector Phase 2 |
| JWT storage | httpOnly cookie (secure, SameSite=Strict) | Bezpieczniejsze niż localStorage — chroni przed XSS |
| ID kolumny | UUID (users.id, FK references) | Spójność w całej aplikacji, zmiana z TEXT |
| Memory | 3 warstwy | Chat (JSONB) + RAG + Projekty |
| Chat persistence | JSONB per chat (UIMessage[]) | AI SDK recommended, validateUIMessages() |
| Document Gen | pdfkit + docx + exceljs + marked | Nowa impl (stary placeholder) |
| Deep Research | Własna impl (nie pi-subagents) | AI Elements Plan + Task |
| RAG | Router LLM embeddings, auto + tool | top-5 chunków po 1000 zn |
| Projekty | Sidebar section, global + per-project memory | Osobna pamięć, KB, extensions per project |
| Default Tools pakiet | pi-web-access, pi-ocr | 2 gotowce z pi.dev |
| User Facts | PostgreSQL user_facts table | Prosta pamięć cross-session dla 20 userów |
| CSRF | SameSite=Strict + double-submit token | Ochrona przed cross-site POST |
| AGENT_API_KEY | shared secret Next.js ↔ Pi Agent | Zapobiega direct POST na :4000 |
| Pi Agent bind | 127.0.0.1 (localhost only) | Nie dostępny z zewnątrz |
| Frontend transport | DefaultChatTransport { streamProtocol: 'data', credentials: 'include' } | Wymagane dla AI Elements + httpOnly cookie |

## Projects (Gems)

Projekty to osobne przestrzenie robocze dla użytkownika — jak Gemini Gems lub projekty w ChatGPT.

### Koncept
- User może mieć wiele projektów (np. "Moja firma", "Klient A", "Strona WWW")
- Każdy projekt ma:
  - `name`, `description`
  - `instructions` — custom system prompt (jak Gems instructions)
  - `documents` — Knowledge Base pliki dla RAG
  - `memory` — osobna przestrzeń user_facts per projekt
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
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- FIX: zmienione z tenant_id
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  memory_namespace TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_documents (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES vault_files(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, file_id) -- FIX: id usunięte, composite primary key
);

CREATE TABLE project_extensions (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  extension_id TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}', -- per-extension config (API keys etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, extension_id) -- FIX: id usunięte, composite primary key
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
4. **Storage**: embedding + chunk + metadata zapisane w PostgreSQL (tabela rag_chunks)
5. **Query**: user zadaje pytanie → embed query → cosine similarity search → top-10 chunków
6. **Injection**: chunk-i + źródła wstrzyknięte do promptu agenta
7. **Response**: agent odpowiada z cytowaniem źródła (source-url, source-document)

### RAG w projekcie
- Każdy projekt ma osobny namespace embeddingów w PostgreSQL
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

3 warstwy pamięci, każda inna odpowiedzialność:

```
Warstwa 3: Projekty (Gems)          ← per-project: instrukcje + KB + memory + extensions
Warstwa 2: RAG / Knowledge Base     ← PostgreSQL + cosine similarity w TS: dokumenty → chunk → embed → search
Warstwa 1: Chat persistence (JSONB) ← PostgreSQL: UIMessage[], resumable streams
```

### Warstwa 1 — Chat persistence
- Tabela: `sessions` z kolumną `messages JSONB` (UIMessage[])
- `saveChat({ chatId, messages })` i `loadChat(chatId)` jak w dokumentacji AI SDK
- `onFinish` callback — zapis pełnej sesji po zakończeniu streamowania
- `validateUIMessages()` — walidacja zgodności schematów przy ładowaniu

### Warstwa 2 — RAG / Knowledge Base
- Dokumenty → chunk (1000 zn, 200 overlap) → embed (Router LLM embeddings endpoint) → PostgreSQL
- Cosine similarity w TypeScript (bez pgvector — wystarczy dla 20 userów)
- Automatyczny search przed każdym requestem + tool `search_kb`
- Top-5 chunków injectowanych do promptu
- AI Elements Sources + InlineCitation

### Warstwa 3 — Projekty (Gems)
- Sidebar section: przełącznik projektów
- Per project: instructions + dokumenty (KB) + memory + extensions
- AgentSession ładuje kontekst projektu przy starcie
- User + per project extensions

### User Facts (zamiast Memory API)
- Tabela `user_facts` w PostgreSQL (key-value per user)
- Agent zapisuje/pobiera fakty o userze cross-session
- Nie potrzebuje osobnego serwisu Python — prostsze utrzymanie dla 20 userów

## User & Project Isolation

- `UserSessionPool` — `Map<userId, AgentSessionRuntime>` — każdy user ma runtime, sesje swapowane per project
- `WHERE user_id = ?` — na każdym zapytaniu SQL
- `extensions/core/` — ładowane przy starcie, filtrowane per project w `customTools`
- `AGENT_API_KEY` — shared secret Zapobiega direct dostępowi do :4000 bez Next.js proxy

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
