# UBEK Next — Pełny audyt (2026-06-09)

## Metodologia
- Subagenci: security-reviewer, database-reviewer, refactor-cleaner, planner
- Weryfikacja krzyżowa znalezisk z rzeczywistym kodem
- 71 plików, 5.4k LOC, 109 testów

---

## 1. Bezpieczeństwo

### 🔴 Critical (0)
Wszystkie krytyczne issue z poprzedniego code review zostały naprawione:
- XSS w SSE (`escapeHtml` w `routes/chat.ts`) ✅
- Path traversal w Registry (`path.resolve` + `startsWith`) ✅
- Root layout `'use client'` → Server Component ✅
- Hardcoded `role` → czytane z API ✅
- CSRF double-submit cookie w middleware ✅
- Username enumeration (zawsze `bcrypt.compare`) ✅

### 🟠 High (2)
| # | Problem | Lokalizacja | Rekomendacja |
|---|---|---|---|
| H1 | `JWT_SECRET` z domyślną wartością w docker-compose.yml | `docker-compose.yml:12` | Usunąć domyślną wartość, wymusić ustawienie w env |
| H2 | Brak `index()` na `userFacts.userId` — tylko `uniqueIndex(userId, key)` | `drizzle/schema.ts:80` | Dodać osobny index dla samego userId (przyspieszenie `findByUserId`) |

### 🟡 Medium (4)
| # | Problem | Lokalizacja | Rekomendacja |
|---|---|---|---|
| M1 | Rate limiter globalny (współdzielony Map) | `agent/src/routes/chat.ts` | Użyć Redis lub per-instance z limitem łącznych sesji |
| M2 | Brak walidacji `displayName` w register | `app/api/auth/register/route.ts` | Dodać Zod schema z max length |
| M3 | `cors({ origin: false })` | `agent/src/index.ts:13` | Ustawić configurable origin |
| M4 | Brak `Retry-After` header przy 429 | `agent/src/routes/chat.ts` | Dodać `Retry-After: 60` w response rate limited |

---

## 2. Baza danych

### Schema (10 tabel)
| Tabela | Status | Uwagi |
|---|---|---|
| `users` | ✅ | id, email, passwordHash, name, role, createdAt, updatedAt |
| `projects` | ✅ | userId (FK), name, instructions, icon, timestamps |
| `sessions` | ✅ | userId + projectId (FK), messages (jsonb), timestamps |
| `vaultFiles` | ✅ | userId + projectId (FK), soft delete (deletedAt) |
| `extensions` | ✅ | name, description, hasUi, icon |
| `projectExtensions` | ✅ | Composite PK (projectId, extensionId) |
| `extensionRequests` | ✅ | userId (FK), priority, status, adminNotes |
| `ragChunks` | ✅ | projectId + fileId (FK), embedding (jsonb) |
| `userFacts` | ✅ | userId (FK), key, value (jsonb), unique(userId, key) |
| `auditLog` | ✅ | userId (FK), action, metadata (jsonb) |

### Indeksy
- ✅ FK indeksy: projekty.userId, sessions.userId/projectId, vault.userId/projectId, itd.
- ⚠️ Brak: `userFacts.userId` (tylko composite z key)
- ✅ Unique: users.email, userFacts(userId+key)
- ✅ Timestamp indeksy: vault.createdAt, auditLog.createdAt

### Rekomendacje
| # | Problem | Rekomendacja |
|---|---|---|
| D1 | `embedding` jako jsonb w `ragChunks` | Rozważyć `pgvector` dla produkcyjnych wyszukiwań wektorowych |
| D2 | `messages` jako jsonb w `sessions` | Przy skali >1000 wiadomości na sesję → osobna tabela `sessionMessages` |
| D3 | Brak paginacji w store.ts | Dodać `limit`/`offset` do `findByUserId` we wszystkich store'ach |
| D4 | Seed tylko admina | Dodać seed dla przykładowego usera + vault pliku |

---

## 3. Jakość kodu

### Dead code / nieużywane
| # | Plik | Problem |
|---|---|---|
| K1 | `next/lib/db.ts` | `import { sql } from 'drizzle-orm'` — import nieużywany |
| K2 | `scripts/dev.sh` | Nie ma wpisu w package.json |
| K3 | `next/lib/auth.ts` | `SALT_ROUNDS = 10` — niska wartość, brak komentarza |

### Typy
| # | Plik | Problem |
|---|---|---|
| T1 | `agent/src/routes/chat.ts:13` | `(req as any).userId` — powinno być w `Request` typie |
| T2 | Wiele catchów z `error instanceof Error ? error.message : ...` | Wyodrębnić do helpera `getErrorMessage()` |
| T3 | `next/app/api/auth/register/route.ts` | Email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` — odrzuca `user+tag@example.com` |

### Duplikacja
| # | Plik | Problem |
|---|---|---|
| D1 | Wszystkie store'y | Wzorzec `select().from(X).where(eq(X.id, id)).limit(1)` powtarza się → wyodrębnić `findById` helper |
| D2 | Wszystkie API route'y | Obsługa błędów `catch (err) { return NextResponse.json(...) }` powtarza się → dodać `apiHandler` wrapper |

---

## 4. Zgodność z planem

| Obszar | Plan vs rzeczywistość | Status |
|---|---|---|
| Pi Agent (A1-A8) | Wszystkie 8 zadań zrealizowane | ✅ |
| Next Backend (B1-B6) | Wszystkie 6 zadań zrealizowane | ✅ |
| Frontend (C1-C6) | Wszystkie 6 UI sekcji zrealizowane | ✅ |
| Extensions (D1-D6) | 4 narzędzia zrealizowane, bez testów per-tool | ✅ |
| Infrastruktura | docker-compose, .env.example, pm2, dev.sh — wszystko istnieje | ✅ |
| AuthContext | Plan: `next/lib/auth-context.tsx`, kod: `next/app/layout.tsx` + provider inline | 🔄 akceptowalne |
| Vault API route | Plan: osobny route, kod: tylko frontend page | ⚠️ brak backendu |

---

## 5. Testy

| Subsystem | Pliki | Testy | Pokrycie |
|---|---|---|---|
| Agent | 7 files | 36/36 | ~85% (szac.) |
| Next.js | 7 files | 73/73 | ~80% (szac.) |
| **Razem** | **14 files** | **109/109** | **✅** |

### Brakujące testy
| # | Czego brak | Ważność |
|---|---|---|
| 1 | Integration test: register → login → me → logout → me (full flow) | High |
| 2 | Extensions: unit testy dla każdego toola (web-search, vision, document-gen, memory) | Medium |
| 3 | CSRF: test że POST bez tokena → 403 | High |
| 4 | Rate limit: test że >30 req/min → 429 | High |
| 5 | SSE protocol: test formatu strumienia (event names, [DONE]) | Medium |
| 6 | Middleware: test że /gems → redirect, /auth/login → 200 | Medium |

---

## 6. Podsumowanie

| Obszar | Ocena |
|---|---|
| **Funkcjonalność** | ✅ Wszystkie feature'y Phase 1 zaimplementowane |
| **Bezpieczeństwo** | ✅ 0 critical, 2 high, 4 medium |
| **Baza danych** | ✅ Dobra schema, brak krytycznych błędów |
| **Jakość kodu** | ⚠️ Drobne problemy: dead importy, powtarzalne wzorce |
| **Zgodność z planem** | ✅ Wszystkie główne punkty pokryte |
| **Testy** | ✅ 109/109, ale luki w integracji i security |
| **Infrastruktura** | ✅ docker-compose, Dockerfile, pm2, .env.example, seed |

### Priorytet napraw

1. **High**: dodać index na userFacts.userId, zabezpieczyć JWT_SECRET w docker-compose
2. **Medium**: dodać paginację, testy security (CSRF, rate limit, full auth flow)
3. **Low**: cleanup dead importów, dodać helpery (getErrorMessage, apiHandler, findById)
