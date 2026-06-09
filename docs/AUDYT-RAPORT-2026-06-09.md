# Audyt ubek-next — Pełny raport

**Data:** 2026-06-09
**Audytor:** Hermes Agent
**Projekt:** ubek-next (Next.js 15 + Pi Agent Express)
**Lokalizacja:** /home/kamil/projects/ubek-next/ (Ubek-Dev WSL2, SSH: ubek)
**Stan:** 192 testy (118 next + 74 agent) pass, build OK, typecheck agent OK

---

## TL;DR

ubek-next to solidny fundament: 192 testów przechodzi, build Next.js działa, typecheck agenta czysty, 75 routeów skompilowanych. Główne problemy: (1) Pi SDK zainstalowane ale nieużywane, (2) 3 z 4 core tooli (memory, vision, document-gen) to placeholdery, (3) RAG niekompletny. Łącznie 13 luk: 5 krytycznych, 4 wysokie, 3 średnie, 1 niska.

---

## Luki krytyczne (P0)

### C1: SessionPool.createRuntime() zwraca stub
agent/src/services/SessionPool.ts:103 — createRuntime() zwraca { switchSession: async () => ({}) }.
Fix: Zaimportuj prawdziwy AgentSessionRuntime z Pi SDK.

### C2: Memory tool in-memory — dane giną przy restarcie
extensions/core/memory/tool.ts — new Map<string, Map<string, string>>().
Fix: Zapisz do tabeli userFacts PostgreSQL (schema + store istnieją).

### C3: Document-gen — tylko markdown
extensions/core/document-gen/tool.ts — zwraca markdown string, nie PDF/DOCX/XLSX.
Fix: Dodaj pdfkit, docx, exceljs, marked.

### C4: RAG — niekompletny
next/lib/rag/ — chunker istnieje, brak embeddera i semantic search.
Fix: Embedder przez Router LLM, cosine similarity w TS, wstrzykuj do promptu.

### C5: Vision tool — placeholder
extensions/core/vision/tool.ts — zwraca "captured for processing", nie analizuje.
Fix: Użyj Router LLM vision API.

---

## Luki wysokie (P1)

### H1: Podwójny pool PostgreSQL
next/lib/db.ts — export const db ORAZ getDb() tworzą dwa poole.
Fix: Zostaw tylko getDb() jako singleton.

### H2: Web search — DDG Instant Answer API
extensions/core/web-search/tool.ts — ograniczone API.
Fix: Użyj pi-web-access lub DDG HTML scraping.

### H3: Brakujące indeksy DB
drizzle/schema.ts — userFacts(userId), vaultFiles(userId+deletedAt), ragChunks(projectId+fileId).

### H4: XSS — LLM output bez sanitizacji
next/app/(dashboard)/chat/page.tsx — brak DOMPurify.
Fix: dompurify.sanitize() przed renderem.

---

## Luki średnie (P2)

### M1: Vault upload — brak walidacji MIME/size
### M2: Dokumentacja nieaktualna (PENDING.md, AI Elements claims)
### M3: Brak integration testu auth flow

---

## Luki niskie

### L1: Error message leak (Server config error zamiast ogólnego)

---

## Testy: 192 pass
- Next.js: 118 testów (15 plików)
- Agent: 74 testy (11 plików)

## Mocne strony
- Auth: JWT httpOnly, CSRF, rate limiter
- Guardrails: injection detector, audit logger
- SSL: Pi Agent bind 127.0.0.1, AGENT_API_KEY
- Build: Next.js build OK, typecheck agent OK
- Struktura: czysty podział next/agient, 10 tabel Drizzle
