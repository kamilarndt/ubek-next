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
- [User Workflows](docs/03-USER-WORKFLOWS.md)
- [Test Checklist](docs/04-TEST-CHECKLIST.md)
- [ADR Index](docs/05-ADR-INDEX.md)
- [Extension System](docs/06-EXTENSION-SYSTEM.md)
- [Pi.dev Packages](docs/07-PI-DEV-PACKAGES.md)

## Stack

- **Frontend**: Next.js 15 + Vercel AI SDK v6 + AI Elements + shadcn/ui + Zustand
- **Agent Engine**: Pi Coding Agent SDK (@earendil-works/pi-coding-agent)
- **Backend**: Express (Pi Agent) + PostgreSQL + pgvector
- **RAG**: pgvector embeddings + Router LLM embeddings endpoint
- **LLM**: Router LLM (:18881) — multi-provider gateway
- **Memory**: Python FastAPI (:18766) — cross-session memory
- **Document Gen**: pdfkit (PDF) + docx (DOCX) + exceljs (XLSX) + marked (HTML)
- **Deploy**: PM2 (dwa procesy)

## Features

- **Chat** z AI streaming, tool calling, reasoning, sources
- **Memory 4-warstwowa**: chat persistence (JSONB) + Memory API + RAG + Projekty
- **Projekty (Gems)** — custom instructions + KB + memory + extensions per project
- **RAG / Knowledge Base** — semantic search, chunking, cytowanie źródeł
- **Deep Research** — wieloetapowy research z planem i raportem
- **Vault** — pliki, foldery, preview
- **Document Gen** — PDF, DOCX, XLSX, Markdown
- **Extension Library** — admin builds per-tenant extensions (per user + per project)
- **Admin Dashboard** — agent monitor, extension manager, request queue
