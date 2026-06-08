# UBEK Next — Agent-as-a-Service Platform

Platforma do uruchamiania spersonalizowanych agentów AI dla małych firm. Phase 1: max 20 użytkowników.

## Architektura

```
Next.js 15 (:3000)           Pi Agent Express (:4000)
  AI Elements + shadcn/ui      Pi SDK AgentSession
  useChat() → DefaultChat    → TenantSessionPool
    Transport → :4000           Extensions tool.ts
  API Routes: auth, vault,      SdkSseAdapter → AI SDK Stream Protocol
    extensions, admin           → SSE response
```

## Services & ports

| Service | Port | Start |
|---------|------|-------|
| Frontend (Next.js 15) | 3000 | `cd next && npm run dev` |
| Pi Agent (Express) | 4000 | `cd agent && npx tsx src/index.ts` |
| Memory API (FastAPI) | 18766 | External (z poprzedniego projektu) |
| Router LLM | 18881 | External — multi-provider gateway |

## Szybki start

```bash
./scripts/dev.sh
```

Wymaga: Node ≥ 20, PostgreSQL, Router LLM na :18881.

## Dokumentacja

- [Plan implementacji](IMPLEMENTATION-PLAN.md)
- [Architektura](docs/02-ARCHITECTURE.md)
- [PRD](docs/01-PRD.md)
- [Test Checklist](docs/04-TEST-CHECKLIST.md)

## Stack

- **Frontend**: Next.js 15 + Vercel AI SDK v6 + AI Elements + shadcn/ui + Zustand
- **Agent Engine**: Pi Coding Agent SDK (@earendil-works/pi-coding-agent)
- **Backend**: Express (Pi Agent) + PostgreSQL + pgvector
- **LLM**: Router LLM (:18881) — multi-provider gateway
- **Deploy**: PM2 (dwa procesy)
