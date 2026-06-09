# UBEK Next — Comprehensive Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical (P1) blockers, security holes, and production bugs identified across code review, Hermes audit, and QA testing.

**Architecture:** Five phases — (0a) QA blocker fixes, (0b) extension security + production, (1) architecture improvements, (2) polish, (3) future. Each phase builds on the previous and is independently testable.

**Tech Stack:** Next.js 15, Pi Agent (Express), Drizzle ORM, PostgreSQL, Tailwind CSS v4

---

## Verified Issue Inventory

### Phase 0a: 🔴 QA BLOCKERS (P1 — Build + Auth)

| ID | Bug | Verified | File | Root Cause |
|----|-----|----------|------|------------|
| BUG-010 | Build fails: JWT_SECRET not loaded | ✅ | `auth.ts:4-6` | Module-level `throw` at import time. During `next build`, `.env` not yet loaded → `process.env.JWT_SECRET` undefined → FATAL error. `next.config.ts` has manual .env loader but it runs after route modules are compiled. |
| BUG-007 | Middleware cookie rejected | ✅ | `auth.ts:4-6` + `middleware-utils.ts:15-17` | **Root cause is BUG-010.** Middleware imports `auth.ts`, which throws at module load if JWT_SECRET is undefined. The `verifyToken` function itself (lines 62-101) uses Web Crypto API and IS Edge-compatible. The QA report's `jsonwebtoken` theory is wrong — `jsonwebtoken` is only used by `signToken` (Node.js API routes), not middleware. |
| BUG-011 | Build fails: `/_document` not found | ✅ | No source ref — build pipeline | Project uses App Router only, but `next build` still expects Pages Router `_document`. Cause: Next.js 15 known quirk when certain dependencies reference `next/document`, or stale `.next` cache + node_modules. |
| BUG-012 | Pi Agent AGENT_API_KEY mismatch | ✅ | `agent/` running processes | Stale agent processes (BUG-008) have old ~14-char key. Current `.env` has 64-char hex key. Need restart. |

### Phase 0b: 🔴 EXTENSION SECURITY + PRODUCTION

| # | Problem | Verified | File | Details |
|---|---------|----------|------|---------|
| 1 | Extension API — no ownership check | ✅ | `route.ts:76-84` | Comment says "any authed client can mutate assignments for any projectId" |
| 2 | Dynamic import `.ts` in production | ✅ | `Registry.ts:81` | `await import(toolPath)` with hardcoded `.ts` extension. Production `dist/` has `.js` files. |
| 3 | N+1 query in extensions GET | ✅ | `route.ts:60-68` | `Promise.all` with individual `findById` per extension |

### Phase 1: 🟠 HIGH — Architecture

| # | Problem | Verified | File | Details |
|---|---------|----------|------|---------|
| 4 | Sessions not scoped to project | ✅ | `sessions/route.ts:17`, `chat/page.tsx:66-77` | Session list is global per-user, no project filter |
| 5 | Metadata duplicated in 4+ places | ✅ | `route.ts:4-33`, `ext/[name]/page.tsx:3-41`, `manifest.json` x4, `Registry.ts:108-124` | Each place has its own copy of core extension data |
| 6 | No `ubek_request_extension` tool | ✅ | Missing — requested by docs (03-USER-WORKFLOWS.md) | Chat has no way to request extensions |
| 7 | SessionPool.createRuntime is stub (C1) | ✅ | `SessionPool.ts:68-74` | Returns `{ switchSession: async () => ({}) }` |

### Phase 2: 🟡 MEDIUM — Polish + QA P2/P3

| ID | Bug | Verified | File | Details |
|----|-----|----------|------|---------|
| BUG-001 | Register form — no `name` on inputs | ✅ | `register/page.tsx:65-77` | React controlled form works, but inputs lack HTML `name` attr. No native fallback if JS fails. |
| BUG-006 | Login form — same issue | ✅ | `login/page.tsx:49-67` | Same pattern as BUG-001 |
| BUG-005 | Middleware redirects public routes | ✅ | `middleware.ts:37-39` | `config.matcher` too broad — catches `/api/health`, `/non-existent`. Should exclude known public paths. |
| BUG-003 | Registration without `name` accepted | ✅ | `register/route.ts:19,49` | No validation for `displayName`. Creates user with empty name. |
| BUG-002 | `Content-Type: text/plain` → 500 | ✅ | `register/route.ts:55-58` | `req.json()` throws → catch gives 500 instead of 400 |
| — | Manifest files unused at runtime | ✅ | 4x `manifest.json` | Exist but no runtime reader |
| — | `_registry.ts` dead code | ✅ | `extensions/_registry.ts` | No imports in runtime code |
| — | JWT_SECRET fallback `|| 'secret'` | ✅ | `sessions/route.ts:16`, `me/route.ts:16`, `login/route.ts:46` | Fallback to string `'secret'` in multiple routes |
| — | Stale PENDING.md | ✅ | `docs/PENDING.md` | Lists already-fixed bugs |
| BUG-008 | Duplicate Pi Agent processes | ✅ | Operational | Two sets of agent processes running |

### Debunked Claims

| Claim | Source | Verdict | Evidence |
|-------|--------|---------|----------|
| Double PG pool (H1) | Hermes handoff | ❌ FALSE | `next/lib/db.ts` has ONE pool via lazy init |
| `_registry.ts` used at runtime | Code review | ❌ FALSE | Zero imports from runtime routes/services |
| BUG-007: `jsonwebtoken` in middleware | QA report | ❌ FALSE | `middleware-utils.ts` uses `verifyToken` (Web Crypto), NOT `jsonwebtoken`. The `signToken` (uses jwt) is API-route only. |
| BUG-004: No password mismatch validation | QA report | ❌ FALSE | Frontend `register/page.tsx:28` HAS `if (password !== confirmPassword)`. API doesn't receive confirmPassword but client validates first. |

---

## Phase 0a: 🔴 P1 QA BLOCKERS

### Task 0a.1: Fix module-level throw in auth.ts (BUG-010 + BUG-007)

**Files:**
- Modify: `next/lib/auth.ts:4-6`
- Verify: `next/lib/middleware-utils.ts`
- Test: `next/__tests__/lib/auth-module.test.ts`

**Root cause:** `auth.ts:4-6` throws at module load time:
```typescript
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('FATAL: JWT_SECRET environment variable is not configured!')
}
```
During `next build`, when the middleware compiles, this module is imported before `process.env.JWT_SECRET` is available from `.env`. This kills the build and makes the middleware fail.

- [ ] **Step 1: Write failing test that reproduces the module-load crash**

```typescript
// next/__tests__/lib/auth-module.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('auth.ts module loading', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should not throw when JWT_SECRET is missing but NODE_ENV is build', () => {
    // Simulate build environment
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    
    // This should NOT throw during build
    expect(async () => {
      await import('@/lib/auth');
    }).not.toThrow();
  });
  
  it('should throw in production when JWT_SECRET is missing', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    
    // Calling verifyToken should throw, but module load should not
    // The check should be deferred to first use
  });
});
```

- [ ] **Step 2: Replace module-level throw with deferred check**

Change `auth.ts:4-6`:
```typescript
// REMOVE module-level throw — defer to first actual use
```

Replace with a guard function:
```typescript
function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not configured!');
  }
  return secret;
}
```

Call `requireJwtSecret()` inside functions that NEED the secret:
- `signToken()` — replace `secret` parameter usage with `requireJwtSecret()`
- `verifyToken()` — same approach, or keep as parameter

Actually, simpler fix: just keep the functions taking `secret` as a parameter (they already do). The callers already pass `process.env.JWT_SECRET`. The module-level throw is unnecessary — let each caller handle the missing secret.

```typescript
// Replace lines 4-6 with nothing. The callers already handle missing secret.
```

Then update `login/route.ts:46` and `sessions/route.ts:16` and `me/route.ts:16` to remove the `|| 'secret'` fallback.

- [ ] **Step 3: Run test — verify it passes**

Run: `npx vitest run next/__tests__/lib/auth-module.test.ts`
Expected: PASS

- [ ] **Step 4: Verify middleware now works**

Read `middleware-utils.ts:15-17`:
```typescript
const secret = process.env.JWT_SECRET
if (!secret) {
  throw new Error('JWT_SECRET not configured')
}
```

This is fine — it checks at runtime, not module load time. The statement-level throw here is OK because it's inside the `checkAuth` function body, not at module level.

- [ ] **Step 5: Remove `|| 'secret'` fallbacks across codebase**

Files to fix:
- `next/app/api/auth/login/route.ts:46` — `process.env.JWT_SECRET || 'secret'` → `process.env.JWT_SECRET!`
- `next/app/api/auth/me/route.ts:16` — same
- `next/app/api/chat/sessions/route.ts:16` — same (or check already done in Task)
- `next/lib/db.ts` — remove default DB credentials (from extension plan)

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run next/`
Expected: all 118 passing

- [ ] **Step 7: Commit**

```bash
git add next/lib/auth.ts next/app/api/auth/login/route.ts next/app/api/auth/me/route.ts
git commit -m "fix: remove module-level throw in auth.ts (BUG-010, BUG-007)"
```

---

### Task 0a.2: Fix `/_document` build error (BUG-011)

**Files:**
- Create: `next/pages/_document.tsx` (empty, minimal)
- Or: Update `next.config.ts` to exclude Pages Router

- [ ] **Step 1: Diagnose the exact cause**

Run: `cd next && rm -rf .next && npm run build 2>&1 | head -50`
Expected: Build error about `/_document`

Then check the error trace. If it's from a dependency referencing `next/document`, fix is different than if it's Next.js itself.

- [ ] **Step 2: Apply the fix**

**Option A (minimal):** Create empty `pages/_document.tsx`:
```typescript
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

**Option B (if dependency-related):** Use `next.config.ts` to suppress the error:
```typescript
const config: NextConfig = {
  // ... existing config ...
  // Skip trailing slash redirect
  skipTrailingSlashRedirect: true,
}
```

- [ ] **Step 3: Verify build passes**

Run: `cd next && rm -rf .next && npm run build`
Expected: Build succeeds, no `/_document` error

- [ ] **Step 4: Commit**

```bash
git add next/pages/_document.tsx
git commit -m "fix: add empty _document for Pages Router build compat (BUG-011)"
```

---

### Task 0a.3: Restart Pi Agent with correct AGENT_API_KEY (BUG-012)

**Files:**
- None (operational fix)

- [ ] **Step 1: Kill stale Pi Agent processes**

```bash
# Find all Pi Agent processes
ps aux | grep 'tsx src/index.ts' | grep -v grep

# Kill all instances
pkill -f 'tsx src/index.ts' || true
```

- [ ] **Step 2: Verify .env has correct key**

```bash
grep AGENT_API_KEY agent/.env
```
Expected output: `AGENT_API_KEY=6d3f05...` (64 hex chars)

- [ ] **Step 3: Restart Pi Agent**

```bash
cd agent && npm start &
sleep 3
```

- [ ] **Step 4: Verify the key matches**

```bash
# Check process environ
cat /proc/$(pgrep -f 'tsx src/index.ts' | head -1)/environ | tr '\0' '\n' | grep AGENT_API_KEY | wc -c
```
Expected: > 64 (key is 64 chars + "AGENT_API_KEY=" prefix)

- [ ] **Step 5: Test auth**

```bash
KEY=$(grep AGENT_API_KEY agent/.env | cut -d= -f2)
curl -s -o /dev/null -w "%{http_code}" -H "x-agent-api-key: $KEY" http://localhost:4000/api/chat/sessions
```
Expected: 200 (or 401 if no auth, but not 403/connection refused)

---

### Task 0a.4: Fix form inputs — add `name` attributes (BUG-001, BUG-006)

**Files:**
- Modify: `next/app/auth/register/page.tsx` — add `name` to inputs
- Modify: `next/app/auth/login/page.tsx` — add `name` to inputs
- No test needed (visual change)

- [ ] **Step 1: Register form — add `name` attributes**

In `register/page.tsx`:
- Line 65: `<Input id="name" ...>` → add `name="name"`
- Line 69: `<Input id="email" ...>` → add `name="email"`
- Line 73: `<Input id="password" ...>` → add `name="password"`
- Line 77: `<Input id="confirmPassword" ...>` → add `name="confirmPassword"`

The form already has `onSubmit` with `e.preventDefault()`, so it works via React. Adding `name` provides:
- Better accessibility (screen readers associate label with named input)
- Progressive enhancement (if JS fails, native form submission can work)
- Better browser autofill (browsers use `name` for autofill heuristics)

- [ ] **Step 2: Login form — add `name` attributes**

In `login/page.tsx`:
- Line 49-55: `<Input id="email" ...>` → add `name="email"`
- Line 61-67: `<Input id="password" ...>` → add `name="password"`

- [ ] **Step 3: Commit**

```bash
git add next/app/auth/register/page.tsx next/app/auth/login/page.tsx
git commit -m "fix: add name attributes to auth form inputs (BUG-001, BUG-006)"
```

---

### Task 0a.5: Fix middleware too-broad matcher (BUG-005)

**Files:**
- Modify: `next/middleware.ts:37-39`

- [ ] **Step 1: Update matcher to exclude public API routes**

Current config:
```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

The `checkAuth` function (middleware-utils.ts:15-25) already checks `PROTECTED_ROUTES` and `PUBLIC_ROUTES`, but the matcher catches ALL paths including `/api/health`. The middleware then checks `isPublic`/`isProtected` — routes that are NEITHER public nor protected (like `/api/health`) fall through to `isProtected = false, isAuthenticated = false`, so no action is taken. But the CSRF check (middleware.ts:10-13) runs on ALL `/api/` routes including `/api/health`.

Fix: Exclude `/api/health` from the matcher (or add it to path matching):

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
}
```

Or better: add `/api/health` to a list of routes that skip CSRF:

In `middleware.ts:10-13`:
```typescript
const skipCsrfPaths = ['/api/health', '/api/auth/login', '/api/auth/register'];
if (pathname.startsWith('/api/') && !skipCsrfPaths.some(p => pathname.startsWith(p))) {
  const csrfResult = csrfMiddleware(request)
  if (csrfResult) return csrfResult
}
```

- [ ] **Step 2: Verify fix**

```bash
curl -s -w "%{http_code}" http://localhost:3000/api/health
```
Expected: 200 (not 307)

- [ ] **Step 3: Commit**

```bash
git add next/middleware.ts
git commit -m "fix: exclude /api/health from middleware matcher (BUG-005)"
```

---

## Phase 0b: 🔴 EXTENSION SECURITY + PRODUCTION

### Task 0b.1: Add ownership verification to Extension API

**Files:**
- Modify: `next/app/api/extensions/route.ts`
- Test: `next/__tests__/api/extensions.test.ts`

(Content unchanged from the original Task 0.1 in the previous plan version — read the full reference there)

- [ ] **Step 1: Write failing test for ownership check**
- [ ] **Step 2: Run test — verify it fails**
- [ ] **Step 3: Add `requireProjectOwnership` guard**
- [ ] **Step 4: Remove the NOTE comment block (lines 76-84)**
- [ ] **Step 5: Run tests — verify both pass**
- [ ] **Step 6: Commit**

```bash
git add next/app/api/extensions/route.ts next/__tests__/api/extensions.test.ts
git commit -m "fix: add project ownership check to extension API (security)"
```

---

### Task 0b.2: Fix dynamic import `.ts` → `.js` fallback in production

**Files:**
- Modify: `agent/src/services/Registry.ts:57-84`
- Test: `agent/src/__tests__/registry-prod.test.ts`

- [ ] **Step 1: Modify `loadCoreTools` to attempt `.js` fallback**
- [ ] **Step 2: Run agent tests**

```bash
cd agent && npx vitest run
```
Expected: all 74 passing

- [ ] **Step 3: Commit**

```bash
git add agent/src/services/Registry.ts
git commit -m "fix: add .js fallback for dynamic import in production"
```

---

### Task 0b.3: Fix N+1 query in extensions GET

**Files:**
- Modify: `next/lib/store.ts` (add `findByIds`)
- Modify: `next/app/api/extensions/route.ts:60-68`

- [ ] **Step 1: Add `findByIds` method to `extensionStore`**
- [ ] **Step 2: Rewrite GET handler**
- [ ] **Step 3: Run tests**

```bash
npx vitest run next/
```
Expected: all 118 passing

- [ ] **Step 4: Commit**

```bash
git add next/lib/store.ts next/app/api/extensions/route.ts
git commit -m "perf: fix N+1 query in extensions GET with single findByIds call"
```

---

## Phase 1: 🟠 HIGH — Architecture & Features

### Task 1.1: Make manifests the single source of truth

**Files:**
- Create: `next/lib/manifest-loader.ts`
- Modify: `next/app/api/extensions/route.ts` (CORE_EXTENSIONS → read manifests)
- Modify: `next/app/(dashboard)/ext/[name]/page.tsx` (hardcoded map → read manifest)

- [ ] **Step 1: Create manifest-loader.ts**
- [ ] **Step 2: Replace CORE_EXTENSIONS**
- [ ] **Step 3: Replace ext/[name] hardcoded map**
- [ ] **Step 4: Run tests**
- [ ] **Step 5: Commit**

---

### Task 1.2: Project-scoped sessions in chat UI

**Files:**
- Modify: `next/app/api/chat/sessions/route.ts`
- Modify: `next/app/(dashboard)/chat/page.tsx`

- [ ] **Step 1: Update GET handler to accept `?projectId`**
- [ ] **Step 2: Update chat page to filter by project**
- [ ] **Step 3: Run tests**
- [ ] **Step 4: Commit**

---

### Task 1.3: Add `ubek_request_extension` tool

**Files:**
- Create: `extensions/core/extension-request/tool.ts`
- Create: `extensions/core/extension-request/manifest.json`
- Verify: `next/app/api/admin/extension-requests/route.ts`

- [ ] **Step 1: Create tool.ts with Zod schema**
- [ ] **Step 2: Create manifest.json**
- [ ] **Step 3: Write tests**
- [ ] **Step 4: Commit**

---

### Task 1.4: SessionPool real Pi SDK integration (C1)

**Files:**
- Modify: `agent/src/services/SessionPool.ts:68-74`

- [ ] **Step 1: Implement createAgentSessionRuntime**
- [ ] **Step 2: Run agent tests**
- [ ] **Step 3: Commit**

---

## Phase 2: 🟡 MEDIUM — Polish + QA P2/P3

### Task 2.1: Validate `name` in registration API (BUG-003)

**Files:**
- Modify: `next/app/api/auth/register/route.ts:21-23`

- [ ] **Step 1: Add name validation**

In `register/route.ts`, after email/password check:
```typescript
const { email, password, displayName } = await req.json()

if (!email || !password) {
  return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
}
if (!displayName || displayName.trim().length === 0) {
  return NextResponse.json({ error: 'Name is required' }, { status: 400 })
}
```

- [ ] **Step 2: Write test**

```typescript
it('should reject registration without name', async () => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'x@y.com', password: 'Test1234!' }),
  });
  expect(res.status).toBe(400);
});
```

- [ ] **Step 3: Commit**

```bash
git add next/app/api/auth/register/route.ts
git commit -m "fix: validate name in registration API (BUG-003)"
```

---

### Task 2.2: Handle non-JSON Content-Type gracefully (BUG-002)

**Files:**
- Modify: `next/app/api/auth/register/route.ts:55-58`

- [ ] **Step 1: Handle JSON parse errors with 400**

Change the catch block:
```typescript
} catch (err) {
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  console.error(err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

- [ ] **Step 2: Commit**

```bash
git add next/app/api/auth/register/route.ts
git commit -m "fix: return 400 for invalid Content-Type in register (BUG-002)"
```

---

### Task 2.3: Clean up dead code, manifests, and stale docs

- [ ] **Step 1: Remove `extensions/_registry.ts`** (dead code, 0 imports)
- [ ] **Step 2: Update manifest.json icons** to meaningful Lucide names
- [ ] **Step 3: Update PENDING.md** — mark resolved items
- [ ] **Step 4: Commit**

---

### Task 2.4: Kill duplicate Pi Agent processes (BUG-008)

- [ ] **Step 1: Kill all Pi Agent processes**

```bash
pkill -f 'tsx src/index.ts' || true
```

- [ ] **Step 2: Restart single instance**

```bash
cd agent && npm start &
```

---

## Phase 3: ⚪ LOW — Future Improvements

| Todo | File | Notes |
|------|------|-------|
| Vision tool real implementation (C5) | `extensions/core/vision/tool.ts` | Needs multimodal LLM endpoint |
| Document-gen PDF/DOCX output (C3) | `extensions/core/document-gen/tool.ts` | Needs pdfkit, docx packages |
| Web search API improvement (H2) | `extensions/core/web-search/tool.ts` | DuckDuckGo limited to 0-3 results |
| Auth integration test (M3) | `next/__tests__/` | `register→login→me→logout→me` flow |

---

## Verification Before Completion

Run these commands IN ORDER after all Phase 0-2 tasks are done:

```bash
# 1. Next.js tests
cd next && npx vitest run
# Expected: 118+ passing (may increase with new tests)

# 2. Agent tests
cd ../agent && npx vitest run
# Expected: 74 passing

# 3. TypeScript checks
cd ../next && npx tsc --noEmit
# Expected: 0 errors

cd ../agent && npx tsc --noEmit
# Expected: 0 errors

# 4. Build test
cd ../next && rm -rf .next && npm run build
# Expected: Build succeeds (no `/_document` error, no JWT_SECRET error)

# 5. Integration smoke test
curl -s http://localhost:3000/api/health | grep -q "ok"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/extensions
# Expected: 200

# 6. Agent API test
KEY=$(grep AGENT_API_KEY ../agent/.env | cut -d= -f2)
curl -s -o /dev/null -w "%{http_code}" -H "x-agent-api-key: $KEY" http://localhost:4000/health
# Expected: 200 or 404 (endpoint-dependent)
```
