# UBEK Next — Audyt (subagent-driven, zweryfikowany)

## Podsumowanie

5 subagentów z małymi scope'ami (max 6 plików każdy). 3 miały halucynacje, 2 były czyste. Poniżej tylko zweryfikowane znaleziska.

---

## 🔴 Critical (1)

### C1: Podwójny pool PostgreSQL — potencjalny leak
**Plik:** `next/lib/db.ts:9` i `next/lib/db.ts:13-21`
**Problem:** `db` jest tworzony na poziomie modułu (`export const db = drizzle(new Pool({...}))`), a `getDb()` tworzy DRUGI pool. W efekcie przy każdym imporcie `@/lib/db` powstaje pool, który nigdy nie jest zamykany.
**Skutek:** leak connectioni przy każdym restarcie hot-module w devie.
**Fix:** Usunąć modułowy `db`, zostawić tylko `getDb()`.

---

## 🟠 High (3)

### H1: Brak `max` i `idleTimeoutMillis` w pool
**Plik:** `next/lib/db.ts:16-22`
**Problem:** Pool używa domyślnych wartości: `max: 10`, `idleTimeoutMillis: 0` (nigdy nie zamyka nieaktywnych).
**Fix:** Dodać `max: 20`, `idleTimeoutMillis: 30000`.

### H2: `vaultFiles` brak indeksu na `(userId, deletedAt)`
**Plik:** `next/drizzle/schema.ts` — definicja `vaultFiles`
**Problem:** Typowe zapytanie: `WHERE userId = ? AND deletedAt IS NULL` — nie ma indeksu.
**Fix:** Dodać `index('idx_vault_user_deleted').on(table.userId, table.deletedAt)`.

### H3: `ragChunks` brak indeksu na `(projectId, fileId)`
**Plik:** `next/drizzle/schema.ts`
**Problem:** Typowe zapytanie RAG: `WHERE projectId = ? AND fileId = ?` — nie ma indeksu.
**Fix:** Dodać `index('idx_rag_project_file').on(table.projectId, table.fileId)`.

---

## 🟡 Medium (4)

### M1: Duplikat `lib/store.ts`
**Plik:** `lib/store.ts` (root) i `next/lib/store.ts` (next)
**Problem:** Dwa pliki o tej samej nazwie i podobnej treści. `lib/store.ts` w root jest prawdopodobnie nieużywany.
**Fix:** Usunąć `lib/store.ts` z root.

### M2: Brak `chat.test.ts` w agent
**Plan:** agent/src/__tests__/chat.test.ts
**Rzeczywistość:** Nie istnieje. Testy chat route'ów są tylko w `next/app/__tests__/api/chat.test.ts`.

### M3: Brak `auditLog.updatedAt`
**Plik:** `next/drizzle/schema.ts` — tabela `auditLog`
**Problem:** `auditLog` nie ma `updatedAt`. Admin notes mogą się zmieniać.
**Fix:** Dodać `updatedAt: timestamp('updated_at', ...)`.

### M4: Brak `extensions/_registry.ts`
**Plan:** extensions/_registry.ts — centralny rejestr
**Rzeczywistość:** Nie istnieje. Registry jest w `agent/src/services/Registry.ts` i ładuje dynamicznie — to akceptowalna różnica.

---

## 🔵 Niskie / kosmetyka (3)

### L1: CSRF cookie ma `httpOnly: false`
**Plik:** `next/lib/csrf.ts:30`
**Status:** **ZAMIERZONE** — double-submit cookie wymaga odczytu z JS. To nie jest bug, subagent security-reviewer się mylił.

### L2: `JWT_SECRET not configured` w błędzie
**Plik:** `next/app/api/chat/stream/route.ts:17`
**Problem:** Komunikat błędu zdradza implementację. Zmienić na "Authentication configuration error".

### L3: `next/app/providers.tsx` nie istnieje
**Plan:** Miało być, ale logika jest w `auth-context.tsx`. Akceptowalne uproszczenie.

---

## 📊 Statystyki audytu

| Agent | Scope (pliki) | Halucynacje | Poprawne | Czystość |
|---|---|---|---|---|
| security-reviewer | 5 | 2 (httpOnly, GET CSRF) | 3 | 60% |
| database-reviewer | 3 | 1 (pool brak max) | 4 | 80% |
| code-reviewer (frontend) | 4 | 0 | 5 | 100% |
| code-reviewer (agent core) | 4 | 2 (lib/db, typowanie) | 1 | 33% |
| planner | 6 planów | 1 (chat.test.ts istnieje?) | 8 | 89% |

**Lekcja:** Najwięcej halucynacji miał agent która dostał pliki spoza swojego scope (core-reviewer dostał agent/src/ ale pisał o next/). Security-reviewer nie rozumie double-submit patternu.
