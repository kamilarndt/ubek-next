# UBEK Next — Phase 1 Bootstrap Implementation Plan

> **For agentic workers:** This plan is organized by independent subsystems. Each subsystem can be implemented in parallel by separate subagents using TDD (RED-GREEN-REFACTOR). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the full UBEK Next platform — Pi Agent (Express + Pi SDK), Next.js backend (DB + Auth + API), Next.js frontend (UI), and Core Extensions.

**Architecture:** Two-process architecture: Next.js 15 (:3000) for frontend + API routes, Pi Agent Express (:4000) for Pi SDK session management and streaming. Communication via AI SDK Stream Protocol (HTTP SSE). No CORS — Next.js proxies chat requests to Pi Agent.

**Tech Stack:** Next.js 15, AI SDK v6, AI Elements, React 19, shadcn/ui, Zustand, Express 5, Pi Coding Agent SDK 0.75.2, PostgreSQL 16, Drizzle ORM, Zod, Vitest, Playwright

---

## Overview: Independent Subsystems

```
┌─────────────────────────────────────────────────────────────────┐
│                    UBEK Next Platform                           │
│                                                                 │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐ │
│  │  SUBSYSTEM A        │   │  SUBSYSTEM B + C                 │ │
│  │  Pi Agent (:4000)   │   │  Next.js (:3000)                 │ │
│  │  ┌───────────────┐  │   │  ┌───────────────────────────┐   │ │
│  │  │ Config/Types  │  │   │  │ B: DB + Auth + API Routes │   │ │
│  │  │ SdkSseAdapter │  │   │  │ C: UI (Chat, Vault, ...)  │   │ │
│  │  │ SessionPool   │  │   │  │ D: Extensions (shared)    │   │ │
│  │  │ Chat Stream   │  │   │  └───────────────────────────┘   │ │
│  │  │ Ext Registry  │  │   │                                  │ │
│  │  └───────────────┘  │   └──────────────────────────────────┘ │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Graph

```
Pi Agent ─────────────────────┐
         (no deps on Next.js) │
                              ├── Chat Integration (tested together)
Next.js Backend (DB+Auth) ────┤
         (no deps on Pi Agent)│
                              │
Next.js Frontend (UI) ────────┘
         (depends on API routes existing)
```

### Execution Strategy

1. **Phase A**: Subsystem A (Pi Agent) + Subsystem B (Next.js Backend) — **PARALLEL** (no deps)
2. **Phase B**: Subsystem C (Next.js Frontend) — depends on B API routes being defined
3. **Phase C**: Subsystem D (Extensions) — depends on A registry mechanism
4. **Phase D**: Integration tests — chat flow end-to-end

Each sub-plan is a separate file in this directory:
- `2026-06-09-pi-agent.md` — Subsystem A (Pi Agent Express)
- `2026-06-09-next-backend.md` — Subsystem B (Next.js Backend: DB, Auth, API)
- `2026-06-09-next-frontend.md` — Subsystem C (Next.js Frontend: UI)
- `2026-06-09-extensions.md` — Subsystem D (Core Extensions)
- `2026-06-09-integration.md` — Integration verification (E2E chat flow)

---

## File Map (All Subsystems)

### Subsystem A: Pi Agent (`agent/`)
```
agent/
├── package.json          ← EXISTS (has deps, needs vitest config)
├── tsconfig.json         ← EXISTS
├── vitest.config.ts      ← CREATE
└── src/
    ├── index.ts          ← CREATE: Express server entry point
    ├── config.ts         ← CREATE: env loading + config types
    ├── types.ts          ← CREATE: shared types (ToolDefinition, etc.)
    ├── routes/
    │   ├── chat.ts       ← CREATE: POST /api/chat/stream handler
    │   └── health.ts     ← CREATE: GET /api/health
    ├── services/
    │   ├── SessionPool.ts  ← CREATE: UserSessionPool (Map<userId, runtime>)
    │   ├── SdkSseAdapter.ts ← CREATE: Pi SDK events → AI SDK Stream Protocol
    │   └── Registry.ts     ← CREATE: extension tool loader
    ├── providers.ts      ← CREATE: Router LLM registration
    ├── middleware/
    │   └── auth.ts       ← CREATE: JWT + AGENT_API_KEY verification
    └── utils/
        └── sse.ts        ← CREATE: AI SDK Stream Protocol helpers
```

### Subsystem B: Next.js Backend (`next/`)
```
next/
├── package.json          ← EXISTS (has deps, needs drizzle-kit)
├── tsconfig.json         ← EXISTS
├── vitest.config.ts      ← CREATE
├── drizzle/
│   └── schema.ts         ← CREATE: Drizzle ORM schema (9 tables)
├── middleware.ts         ← CREATE: Next.js JWT middleware
├── lib/
│   ├── auth.ts           ← CREATE: JWT sign/verify, password hash
│   ├── db.ts             ← CREATE: PostgreSQL pool + Drizzle client
│   ├── store.ts          ← CREATE: typed CRUD for all tables
│   └── guardrails/
│       ├── types.ts         ← CREATE: guardrail types
│       ├── rate-limiter.ts  ← CREATE: in-memory rate limiter
│       ├── audit-logger.ts  ← CREATE: audit log to DB
│       ├── injection-detector.ts ← CREATE: prompt injection detection
│       └── validation.ts    ← CREATE: Zod schemas for all inputs
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── sign-in/route.ts   ← CREATE
│   │   │   ├── sign-up/route.ts   ← CREATE
│   │   │   └── me/route.ts        ← CREATE
│   │   ├── chat/stream/route.ts   ← CREATE: proxy to Pi Agent
│   │   ├── vault/route.ts         ← CREATE: vault CRUD
│   │   └── health/route.ts        ← CREATE
│   └── (dashboard)/
│       ├── layout.tsx             ← CREATE: dashboard layout + sidebar
│       └── page.tsx               ← CREATE: dashboard home/chat
```

### Subsystem C: Next.js Frontend (`next/`)
```
next/
├── app/
│   ├── globals.css             ← CREATE: Tailwind + shadcn/ui base
│   ├── layout.tsx              ← CREATE: root layout (html, body, providers)
│   ├── page.tsx                ← CREATE: landing / redirect to chat
│   ├── providers.tsx           ← CREATE: React providers (Theme, Session)
│   ├── auth/
│   │   ├── sign-in/page.tsx    ← CREATE: login form
│   │   └── sign-up/page.tsx    ← CREATE: registration form
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← CREATE: sidebar + topbar + content
│   │   ├── page.tsx            ← CREATE: chat page (useChat + AI Elements)
│   │   ├── vault/
│   │   │   └── page.tsx        ← CREATE: vault file explorer
│   │   └── settings/
│   │       └── page.tsx        ← CREATE: user settings
│   └── admin/
│       └── page.tsx            ← CREATE: admin dashboard (placeholder)
├── components/
│   ├── layout/
│   │   ├── app-sidebar.tsx     ← CREATE: sidebar with projects, nav, extensions
│   │   └── topbar.tsx          ← CREATE: top bar with project selector
│   ├── chat/
│   │   └── chat-container.tsx  ← CREATE: main chat with AI Elements
│   └── ui/                     ← shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── sheet.tsx
│       ├── dialog.tsx
│       └── avatar.tsx
├── stores/
│   ├── auth-store.ts           ← CREATE: Zustand auth state
│   ├── chat-store.ts           ← CREATE: Zustand chat sessions
│   └── ui-store.ts             ← CREATE: Zustand sidebar/ui state
├── hooks/
│   └── use-auth.ts             ← CREATE: auth helper hooks
└── lib/
    └── utils.ts                ← CREATE: cn(), formatters
```

### Subsystem D: Extensions (shared `extensions/`)
```
extensions/
├── _registry.ts                ← CREATE: auto-import all core tools
└── core/
    ├── web-search/
    │   ├── manifest.json       ← CREATE
    │   ├── tool.ts             ← CREATE
    │   └── tool.test.ts        ← CREATE
    ├── vision/
    │   ├── manifest.json       ← CREATE
    │   ├── tool.ts             ← CREATE
    │   └── tool.test.ts        ← CREATE
    ├── document-gen/
    │   ├── manifest.json       ← CREATE
    │   ├── tool.ts             ← CREATE
    │   └── tool.test.ts        ← CREATE
    └── memory/
        ├── manifest.json       ← CREATE
        ├── tool.ts             ← CREATE
        └── tool.test.ts        ← CREATE
```

---

## TDD Rules (for all subagents)

1. **RED**: Write the test first. It MUST fail.
2. **GREEN**: Write minimal code to pass. NO speculative features.
3. **REFACTOR**: Clean up, keep tests green.
4. **One test at a time**: Vertical slices, NOT horizontal.
5. **80%+ coverage** minimum.
6. **Commit after each GREEN** with format: `feat(scope): description`

---

## Execution Offer

**Plan complete.** Three execution options:

### Option 1: Sequential (recommended for Phase 1)
Execute A → B → C → D in order. Each phase builds on the last.

### Option 2: Parallel Subagent-Driven
**Requires subagent-driven-development skill.**
- Phase A (Pi Agent) + Phase B (Next.js Backend) in parallel → independent
- Phase C (Frontend) after B → depends on API routes
- Phase D (Extensions) after A → depends on registry

### Option 3: Inline Execution
Execute tasks in this session using executing-plans with checkpoints.

**Which approach?**
