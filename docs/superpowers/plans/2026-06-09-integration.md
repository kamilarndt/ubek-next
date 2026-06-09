# Integration: Chat Flow E2E — Verification Plan

> **For agentic workers:** Run after all subsystems (A, B, C, D) are implemented and tested individually.

**Goal:** Verify the full chat flow works end-to-end: Browser → Next.js proxy → Pi Agent → streaming → UI rendering.

**Flow to verify:**
```
PromptInput → POST /api/chat/stream (Next.js)
  → JWT extraction from httpOnly cookie
  → Forward to localhost:4000/api/chat/stream
  → Auth middleware (JWT + AGENT_API_KEY)
  → UserSessionPool.getRuntime(userId)
  → Echo response (Phase 1) / Pi SDK session.prompt() (Phase 2)
  → SdkSseAdapter (Pi SDK events → AI SDK Stream Protocol)
  → SSE stream back to browser
  → useChat() renders via ChatContainer
```

---

## Manual Verification Steps

### Step 1: Start both servers

```bash
# Terminal 1: Start Pi Agent
cd agent && npx tsx src/index.ts
# Expected: [agent] Pi Agent listening on 127.0.0.1:4000

# Terminal 2: Start Next.js
cd next && npx next dev
# Expected: ▲ Next.js 15 on http://localhost:3000
```

### Step 2: Health check

```bash
# Pi Agent health
curl http://localhost:4000/api/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}

# Next.js health
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}
```

### Step 3: Auth flow

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","name":"Test User"}'
# Expected: 201 with user object + Set-Cookie header with JWT

# Sign in
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'
# Expected: 200 with user object + Set-Cookie
```

### Step 4: Chat flow

```bash
# 1. Get JWT by signing in (capture cookie value)
# 2. Call chat proxy
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<JWT_FROM_STEP3>" \
  -d '{"chatId":"test-1","projectId":"proj-1","message":"Hello"}'
# Expected: SSE stream with AI SDK protocol:
# data: {"type":"start","messageId":"test-1"}
# data: {"type":"text-delta","text":"Echo: Hello"}
# data: {"type":"finish","finishReason":"stop"}
# data: [DONE]
```

### Step 5: UI verification

```
1. Open http://localhost:3000
2. Should redirect to /auth/sign-in
3. Sign up or sign in
4. Should redirect to /chat
5. Sidebar visible with: Chat, Vault, Settings
6. Type a message and send
7. Should see response streaming in (Echo: ...)
8. Navigate to Vault
9. Navigate to Settings
10. Sign out works
```

---

## Automated Test (Playwright — Phase 2)

```typescript
// next/tests/e2e/chat-flow.spec.ts
import { test, expect } from '@playwright/test'

test('full chat flow', async ({ page }) => {
  // Sign up
  await page.goto('/auth/sign-up')
  await page.fill('input[name="email"]', 'e2e@test.com')
  await page.fill('input[name="password"]', 'test1234')
  await page.fill('input[name="name"]', 'E2E User')
  await page.click('button[type="submit"]')
  await page.waitForURL('/chat')

  // Send message
  await page.fill('input[placeholder*="message"]', 'Hello UBEK')
  await page.click('button[type="submit"]')

  // Wait for response
  await page.waitForSelector('text=Echo:', { timeout: 15000 })
  await expect(page.locator('text=Echo:')).toBeVisible()
})
```

---

## Expected Integration Points

| Component | File | Status |
|-----------|------|--------|
| Pi Agent Server | `agent/src/index.ts` | Runs on :4000 |
| Health Route | `agent/src/routes/health.ts` | GET /api/health → 200 |
| Auth Middleware | `agent/src/middleware/auth.ts` | Validates JWT + AGENT_API_KEY |
| Chat Route | `agent/src/routes/chat.ts` | POST /api/chat/stream → SSE |
| SdkSseAdapter | `agent/src/services/SdkSseAdapter.ts` | Maps Pi SDK → AI SDK protocol |
| SSE Protocol | `agent/src/utils/sse.ts` | AI SDK helpers |
| Next.js Auth | `next/lib/auth.ts` | JWT sign/verify |
| Next.js Middleware | `next/middleware.ts` | Protects routes |
| Chat Proxy | `next/app/api/chat/stream/route.ts` | Forwards to :4000 |
| Chat UI | `next/components/chat/chat-container.tsx` | useChat + streaming |
| Auth Pages | `next/app/auth/*/page.tsx` | Sign-in/sign-up forms |
| Dashboard | `next/app/(dashboard)/layout.tsx` | Sidebar + topbar |
