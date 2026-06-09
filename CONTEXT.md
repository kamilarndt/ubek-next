# UBEK Next — Domain Glossary

## Core Concepts

### User
Osoba korzystająca z platformy. W Phase 1: 1 user = 1 konto. Każdy user ma login, hasło, własne sesje, projekty, vault.

### Project (Gem)
Osobna przestrzeń robocza usera — jak Gemini Gems lub projekty w ChatGPT. Ma `instructions` (system prompt), vault, i własne sesje.

### Session
Chat session przechowywana w PostgreSQL (`sessions` tabela). Każda ma JSONB `messages` i należy do usera + projektu.

## Architecture

### Frontend (Next.js 15) — :3000
- App Router z layoutem dashboard + auth pages
- `useChat()` z `@ai-sdk/react` v3 — streaming przez `DefaultChatTransport`
- API Routes: auth (register, login, logout, me), projects (CRUD), vault (upload/list/download/delete), chat (sessions CRUD + messages, stream proxy)
- Guardrails: InjectionDetector, RateLimiter, CSRF double-submit
- Auth: JWT w httpOnly cookie, middleware redirect

### Pi Agent (Express) — :4000
- Express server z auth middleware (JWT + AGENT_API_KEY)
- POST `/api/chat/stream`: przyjmuje message, ładuje narzędzia z Registry, woła Router LLM, streamuje odpowiedź, obsługuje tool loop
- `SdkSseAdapter`: mapuje wewnętrzne eventy → AI SDK Stream Protocol
- `SessionPool`: in-memory Map<userId, runtime>, cleanup co 5 min
- `ExtensionRegistry`: ładuje `extensions/core/*/tool.ts` dynamicznie
- `chat-service.ts`: tool loop — parse SSE, detect tool_calls, execute, second call

### Router LLM — :18881
Multi-provider LLM gateway. OpenAI-compatible API. Klucz `ROUTER_API_KEY`.

### Chat Flow (aktualny)
1. User pisze → `useChat()` → `POST /api/chat/stream` (Next.js proxy)
2. Next.js weryfikuje JWT, ładuje/tworzy session w DB (sessions CRUD)
3. Forward do `localhost:4000/api/chat/stream` z JWT + AGENT_API_KEY
4. Pi Agent weryfikuje auth, rate limit, ładuje Extensions Registry
5. Woła Router LLM z message + tool definitions (web-search, vision, etc.)
6. Streamuje odpowiedź SSE przez SdkSseAdapter
7. Jeśli model zechce tool → wykonuje tool → woła LLM z wynikiem → streamuje final

### Auth
JWT (httpOnly, SameSite=Strict) + CSRF double-submit. AGENT_API_KEY shared secret.

### Core Extensions
`extensions/core/{name}/tool.ts`: web-search (DuckDuckGo API), vision (stub), document-gen (markdown), memory (in-memory Map).

### Database (PostgreSQL :5433)
10 tabel: users, projects, sessions, vault_files, extensions, project_extensions, extension_requests, rag_chunks, user_facts, audit_log. Drizzle ORM.

## Status
- 140 testów (104 Next.js + 36 Agent)
- 19 route'ów Next.js
- Build OK
- Brakuje: system prompt per project (F-03), RAG (F-10), frontend session switching
