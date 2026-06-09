> **UPDATE 2026-06-09:** Większość krytycznych issue naprawionych:
> - ✅ SdkSseAdapter: wszystkie 5 eventów działa (start, text-end, reasoning-end, [DONE], error)
> - ✅ Security: CSRF, AGENT_API_KEY, bind 127.0.0.1, XSS (dompurify)
> - ✅ DB Schema: wszystkie indeksy dodane
> - ✅ Frontend: transport skonfigurowany poprawnie
> - ✅ Module-level throw w auth.ts usunięty (build blocker)
> - ✅ Extension API ownership check dodany
> - ✅ Vault path traversal guards dodane
> - ✅ SessionPool: LRU + maxSize
> - ✅ Dynamic import .js fallback
> - ✅ N+1 query fixed
> - ✅ Middleware CSRF exclusion
> - ✅ Vault file cleanup na DB error
> - ✅ Form name attributes, API validation
> - ✅ Agent dotenv auto-load
>
> Szczegóły: git log --oneline -10
> Aktualny commit: 8e9f76c
> Testy: 210/210 pass

# UBEK Next — Issues otwarte & decyzje do podjęcia

Ostatnia aktualizacja: 2026-06-09 (po review — uproszczenie Phase 1)

---

## ✅ Rozwiązane (z tej sesji)

| # | Problem | Rozwiązanie |
|---|---------|-------------|
| 1 | `@ai-sdk/react` ^1 → ^3 | Poprawione w next/package.json |
| 2 | Duplikaty feature ID w PRD | F-09..F-12 → F-13..F-16 |
| 3 | Rate limiter 30 vs 60 | Ustandaryzowane na 30 req/min |
| 4 | Memory API = over-engineering | Zastąpione user_facts tabelą |
| 5 | pgvector = over-engineering | Zastąpione cosine similarity w TS |
| 6 | ioredis = pusty REDIS_URL | Usunięte, in-memory rate limiter |
| 7 | Brak narzędzia migracji DB | Drizzle ORM + drizzle-kit dodane |
| 8 | Pi SDK ^0.75 → exact | Pin na 0.75.2 |
| 9 | AGENT_API_KEY brak w .env | Dodane |
| 10 | SdkSseAdapter: brak start + reasoning-end | Udokumentowane w krytycznych fixach |

---

## 🔴 Krytyczne — musi być rozwiązane przed implementacją

### 1. SdkSseAdapter — 5 braków protokołu
- **Brak `start`**: `sendAISDKStart()` istnieje w `sse.ts` ale adapter go NIGDY nie wywołuje. AI SDK v6 wymaga `{ type: 'start', messageId }` jako pierwszego eventu.
- **Brak `text-end`**: `sendAISDKTextEnd()` istnieje w kodzie ale NIGDY nie jest wywoływana. AI Elements nie wykryje końca bloku tekstu → shimmer permanentny.
- **Brak `reasoning-end`**: Adapter wysyła `reasoning-delta` ale nigdy nie kończy bloku reasoning `sendAISDKReasoningEnd()`.
- **Brak `[DONE]`**: `sendAISDKFinish()` wysyła tylko `{ type: 'finish' }`, bez `data: [DONE]\n\n`. AI SDK v6 wymaga obu.
- **Brak `error` event**: Brak case dla eventu `error` z Pi SDK — klient nie dostanie informacji o błędzie.

### 2. Security — luki
- [ ] **CSRF na `/api/chat/stream`**: httpOnly cookie automatycznie wysyłane. Potrzebny double-submit token lub Origin header check.
- [ ] **AGENT_API_KEY**: Brak shared secret między Next.js a Pi Agentem. Każdy z JWT może direct POST na :4000.
- [ ] **Pi Agent bind**: Express domyślnie `0.0.0.0` — wymagane `127.0.0.1`.
- [ ] **XSS (LLM output)**: LLM output wysyłany do AI Elements bez sanitizacji. Potrzebny `dompurify`.

### 3. DB Schema — problemy
- [ ] **`users.id`**: Zmienić z TEXT na UUID. Spójność z nowym schematem.
- [ ] **FK indexes**: Dodać: `project_extensions(extension_id)`, `extension_requests(user_id)`, `rag_chunks(file_id)`.
- [ ] **`rag_chunks.updated_at`**: Dodać kolumnę.
- [ ] **`vault_files`**: Dodać `idx_vault_created_at`.

### 4. Frontend — konfiguracja transportu
- [ ] **`credentials: 'include'`**: `DefaultChatTransport` przy absolutnym URL nie dodaje auto.
- [ ] **`streamProtocol: 'data'`**: Wymagane explicite.
- [ ] **Next.js proxy**: Browser → `/api/chat/stream` (Next.js API Route) → `localhost:4000/api/chat/stream` (Pi Agent).

---

## 🟡 Ważne — do decyzji

### 5. PiAgentService split
Plik 982 linii z wieloma problemami — decyzja o podziale:
- `session.ts` — UserSessionPool + session lifecycle
- `registry.ts` — extensions/tools loading
- `stream.ts` — stream handling + retry logic
- `system-prompt.ts` — system prompt management

### 6. Extension registry
- [ ] `_registry.ts` auto-import (static) — OK dla Phase 1
- [ ] Lazy-loading — przełożone na Phase 3

### 7. DB jako source of truth
- [ ] `SessionManager.inMemory()` — OK dla Phase 1 (DB trzyma historię)
- [ ] `SessionManager.create(cwd)` — rozważyć dla Phase 2 (lepsza reliability)

### 8. Router LLM config
- [ ] `ROUTER_API_KEY` — musi być w `.env`
- [ ] `x-api-key` header w provider config — zweryfikowane, działa

### 9. Drizzle ORM + migracje
- [ ] Dodać `drizzle-orm` + `drizzle-kit` do next/package.json ✅ (już dodane)
- [ ] Stworzyć `next/drizzle/schema.ts` — Drizzle schema zamiast raw SQL
- [ ] Stworzyć `next/drizzle/migrations/` — numerowane pliki migracji
- [ ] `npm run db:migrate` skrypt do aplikowania migracji

### 10. Session switch — edge case'y
- [ ] Co się dzieje gdy user ma in-flight tool call i przełącza projekt?
- [ ] Dwa jednoczesne requesty na różnych projektach tego samego usera?
- [ ] Session cleanup po timeout — co z niezapisaną historią?

---

## 🟢 Zdecydowane (nie wymaga dyskusji)

| Decyzja | Wybór |
|---------|-------|
| Test framework | Vitest (unit/integration) + Playwright (E2E) |
| JWT storage | httpOnly cookie (SameSite=Strict, Secure) |
| Auth pattern | Next.js proxy (ten sam origin) → Authorization: Bearer do Pi Agent |
| ID columns | UUID dla users, projects (nie TEXT) |
| DB schema | Nowy design bez tenants/channels/stripe (9 tabel) |
| Frontend | Zero reuse z starego — wyłącznie AI SDK v6 + AI Elements |
| Session model | Per-project przez AgentSessionRuntime.switchSession() |
| Monitoring | PM2 z max_restarts:10 |
| AGENT_API_KEY | Shared secret Next.js ↔ Pi Agent (w .env) |
| CORS | Niepotrzebny w produkcji (Next.js proxy) |
| Rate limiter | 30 req/min dla Phase 1 (20 userów) |
| Memory | 3 warstwy (chat JSONB + RAG + Projekty), user_facts tabela |

---

## ⚠️ Ryzyka

| Ryzyko | Impact | Mitigation |
|--------|--------|------------|
| Pi SDK breaking changes | Wysoki (blokuje cały chat) | Pin wersji `0.75.2` (exact) |
| Router LLM downtime | Wysoki (brak odpowiedzi) | Circuit breaker + retry (już w kodzie) |
| AI Elements API changes | Średni (UI się psuje) | Pin wersji, testy E2E |
| DB migration z UUID | Średni (dane trzeba zmigrować) | Nowa baza dla ubek-next, clean start |

---

## 📋 Plan na następną sesję (kolejność)

1. 📄 **Przeczytać wszystkie docs**: `IMPLEMENTATION-PLAN.md`, `CONTEXT.md`, `docs/02-ARCHITECTURE.md`, `docs/06-CORE-EXTENSIONS.md`, `PENDING.md`
2. 🏗️ **Bootstrap struktury**: `next/` + `agent/` katalogi, `package.json` dla obu
3. 🔧 **SdkSseAdapter fixy**: text-end, [DONE], error event (P1)
4. 🔐 **Auth implementation**: JWT + httpOnly cookie + CSRF + AGENT_API_KEY
5. 🗄️ **DB schema**: Nowy schemat z UUID + indeksami
6. 📡 **Chat proxy**: Next.js API Route → Pi Agent forward
7. 💬 **Frontend chat**: AI Elements + useChat
8. 🧪 **Testy**: TDD od początku, minimum 80% coverage
