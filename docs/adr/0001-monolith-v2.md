# ADR 0001: Two-process architecture — Next.js + Pi Agent

## Status

Accepted

## Context

UBEK Next musi być zbudowany od nowa z następującymi założeniami:
- Pi Agent (Pi Coding Agent SDK) jako centrum — zarządza sesjami, toolami, LLMem
- Frontend od zera z Vercel AI SDK v6 + AI Elements
- Extensions jako produkt do sprzedaży — per-tenant, reusable
- Pi SDK trzyma sesje w pamięci — potrzebuje long-lived procesu
- Frontend nie może paść gdy Pi SDK crashuje

Rozważaliśmy dwa warianty:
1. **Monolit**: wszystko w Next.js (API Routes + Pi SDK) — jeden proces, zero CORS
2. **Dwa procesy**: Next.js (frontend) + Pi Agent Express (Pi SDK) — izolacja

## Decision

Wybieramy **dwa procesy**:

| Proces | Technologia | Port | Odpowiedzialność |
|--------|------------|------|-----------------|
| Frontend | Next.js 15 | 3000 | UI, Auth, Vault, Admin, Extension UI pages |
| Pi Agent | Express | 4000 | Pi SDK, TenantSessionPool, Extensions, Streaming |

Komunikacja: HTTP POST + SSE przez AI SDK Stream Protocol.

## Consequences

### Positive
- Fault isolation: crash Pi Agenta nie zabija frontendu. PM2 restartuje Pi Agent w 3s.
- Long-lived sesje: Pi Agent trzyma sesje w pamięci Map<tenantId, session>. Restart Next.js nie kasuje sesji.
- Skalowalność: w Phase 3 można dodać więcej workerów Pi Agenta.
- Czysty streaming: Pi Agent emituje AI SDK Stream Protocol, useChat konsumuje natywnie.
- Bez CORS: Next.js proxy lub DefaultChatTransport z URL do :4000.

### Negative
- Dwa procesy PM2 zamiast jednego — więcej do monitorowania.
- SdkSseAdapter (~200 linii) jako nieunikniony klej między Pi SDK events a AI SDK protocol.
- Wspólny JWT secret między dwoma procesami.

## Alternatives

### Monolit (Next.js API Routes + Pi SDK)
- **Za**: jeden proces, zero CORS, prostszy deploy
- **Przeciw**: restart Next.js (hot-reload, deploy) = utrata sesji. Crash Pi SDK = crash całej aplikacji.
- **Odrzucone**: dla Fazy 1 (20 userów) dopuszczalne, ale ryzyko nie warte zysku.

### Pure AI SDK (ToolLoopAgent, bez Pi SDK)
- **Za**: zero adaptera, native streaming, prostsze
- **Przeciw**: brak extension systemu, brak SKILL.md per tenant, brak TenantSessionPool
- **Odrzucone**: Pi SDK daje extensiony które są produktem. Bez Pi SDK nie ma produktu do sprzedania.
