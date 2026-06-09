# Subsystem C: Next.js Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use TDD where applicable (component rendering tests with vitest/jsdom). UI components use AI Elements + shadcn/ui. Commit after each GREEN.

**Goal:** Build the Next.js frontend UI — layout, auth pages, chat page with AI Elements, vault page, settings page, admin dashboard.

**Architecture:** Next.js 15 App Router, React 19, AI SDK v6, AI Elements, shadcn/ui, Zustand, Tailwind CSS v4. Communicates with backend via API routes (same origin, no CORS).

**Tech Stack:** Next.js 15, React 19, AI SDK v6, AI Elements, shadcn/ui, Zustand 5, Tailwind CSS 4, lucide-react, vitest, @testing-library/react

---

## File Structure

```
next/
├── app/
│   ├── globals.css                   ← CREATE
│   ├── layout.tsx                    ← CREATE: root layout (html, body, inter font)
│   ├── page.tsx                      ← CREATE: redirect to /chat
│   ├── providers.tsx                 ← CREATE: React providers (SessionProvider)
│   ├── auth/
│   │   ├── sign-in/page.tsx          ← CREATE: login form
│   │   └── sign-up/page.tsx          ← CREATE: registration form
│   ├── (dashboard)/
│   │   ├── layout.tsx                ← CREATE: sidebar + content layout
│   │   ├── chat/
│   │   │   └── page.tsx              ← CREATE: chat with useChat + AI Elements
│   │   ├── vault/
│   │   │   └── page.tsx              ← CREATE: vault file explorer
│   │   └── settings/
│   │       └── page.tsx              ← CREATE: user settings
│   ├── admin/
│   │   └── page.tsx                  ← CREATE: admin dashboard
│   └── ext/
│       └── [name]/page.tsx           ← CREATE: dynamic extension page
├── components/
│   ├── layout/
│   │   ├── app-sidebar.tsx           ← CREATE
│   │   └── topbar.tsx                ← CREATE
│   ├── chat/
│   │   └── chat-container.tsx        ← CREATE
│   └── ui/                           ← shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── sheet.tsx
│       └── avatar.tsx
├── stores/
│   ├── auth-store.ts                 ← CREATE
│   └── ui-store.ts                   ← CREATE
├── hooks/
│   └── use-auth.ts                   ← CREATE
├── lib/
│   └── utils.ts                      ← CREATE
└── app/__tests__/
    └── components.test.tsx           ← CREATE
```

---

### Task C1: Root Layout + globals.css + Providers + Utils

**Files:**
- Create: `next/app/globals.css`
- Create: `next/app/layout.tsx`
- Create: `next/app/page.tsx`
- Create: `next/app/providers.tsx`
- Create: `next/lib/utils.ts`

- [ ] **Step 1: Write globals.css**

```css
/* next/app/globals.css */
@import "tailwindcss";

@plugin "tailwindcss-animate";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0.042 265.755);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.965 0.001 286.375);
  --secondary-foreground: oklch(0.205 0.042 265.755);
  --muted: oklch(0.965 0.001 286.375);
  --muted-foreground: oklch(0.556 0.011 286.375);
  --accent: oklch(0.965 0.001 286.375);
  --accent-foreground: oklch(0.205 0.042 265.755);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0.004 286.375);
  --input: oklch(0.922 0.004 286.375);
  --ring: oklch(0.205 0.042 265.755);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0.042 265.755);
  --secondary: oklch(0.269 0.015 286.375);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0.015 286.375);
  --muted-foreground: oklch(0.708 0.01 286.375);
  --accent: oklch(0.269 0.015 286.375);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.269 0.015 286.375);
  --input: oklch(0.269 0.015 286.375);
  --ring: oklch(0.439 0.023 286.375);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@utility container {
  @media (width >= --theme(--breakpoint-sm)) { max-width: none; }
  @media (width >= 1400px) { max-width: 1400px; }
}

* {
  border-color: var(--border);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 2: Write utils.ts**

```typescript
// next/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
```

- [ ] **Step 3: Write root layout**

```tsx
// next/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UBEK — Agent AI dla Twojej firmy',
  description: 'Spersonalizowany agent AI dla małych firm',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Write providers**

```tsx
// next/app/providers.tsx
'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' })
    } finally {
      setUser(null)
      window.location.href = '/auth/sign-in'
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 5: Write root page (redirect)**

```tsx
// next/app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/chat')
}
```

- [ ] **Step 6: Verify build**

Run: `cd next && npx next build 2>&1 | head -30`
Expected: Build succeeds (may have type errors if other pages missing, but should still compile)

- [ ] **Step 7: Commit**

```bash
git add next/app/globals.css next/app/layout.tsx next/app/page.tsx next/app/providers.tsx next/lib/utils.ts
git commit -m "feat(ui): add root layout, globals CSS, providers, and utils"
```

---

### Task C2: Auth Pages (Sign-in + Sign-up)

**Files:**
- Create: `next/app/auth/sign-in/page.tsx`
- Create: `next/app/auth/sign-up/page.tsx`

- [ ] **Step 1: Write sign-in page**

```tsx
// next/app/auth/sign-in/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Invalid credentials')
        return
      }

      router.push('/chat')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Sign in to UBEK</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/auth/sign-up" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write sign-up page**

```tsx
// next/app/auth/sign-up/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Registration failed')
        return
      }

      router.push('/chat')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Get started with UBEK
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd next && npx next build 2>&1 | head -30`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add next/app/auth/sign-in/page.tsx next/app/auth/sign-up/page.tsx
git commit -m "feat(ui): add sign-in and sign-up pages"
```

---

### Task C3: Dashboard Layout + Sidebar + Topbar

**Files:**
- Create: `next/app/(dashboard)/layout.tsx`
- Create: `next/components/layout/app-sidebar.tsx`
- Create: `next/components/layout/topbar.tsx`

- [ ] **Step 1: Write dashboard layout**

```tsx
// next/app/(dashboard)/layout.tsx
'use client'

import { AppSidebar } from '@/components/layout/app-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useAuth } from '@/app/providers'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/sign-in')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write sidebar**

```tsx
// next/components/layout/app-sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/vault', label: 'Vault', icon: '📁' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/chat" className="text-lg font-semibold">
          UBEK
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="mb-2 text-sm font-medium truncate">
          {user?.name || user?.email}
        </div>
        <button
          onClick={logout}
          className="w-full rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Write topbar**

```tsx
// next/components/layout/topbar.tsx
'use client'

export function Topbar() {
  return (
    <header className="flex h-14 items-center border-b px-6">
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        {/* Future: project selector, notifications, etc. */}
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `cd next && npx next build 2>&1 | head -40`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add next/app/\(dashboard\)/layout.tsx next/components/layout/app-sidebar.tsx next/components/layout/topbar.tsx
git commit -m "feat(ui): add dashboard layout with sidebar and topbar"
```

---

### Task C4: Chat Page with AI Elements

**Files:**
- Create: `next/app/(dashboard)/chat/page.tsx`
- Create: `next/components/chat/chat-container.tsx`

- [ ] **Step 1: Write chat container**

```tsx
// next/components/chat/chat-container.tsx
'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'

export function ChatContainer() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: '/api/chat/stream',
      streamProtocol: 'data',
      credentials: 'include',
      id: 'default-chat',
    })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Start a conversation
              </h2>
              <p className="text-sm text-muted-foreground/60">
                Ask me anything about your business
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {message.content && (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              )}

              {/* Tool calls */}
              {message.toolInvocations?.map((tool) => (
                <div key={tool.toolCallId} className="mt-2 rounded bg-background/50 p-2 text-xs">
                  <span className="font-medium">🔧 {tool.toolName}</span>
                  {tool.state === 'result' && tool.result && (
                    <pre className="mt-1 overflow-x-auto text-xs">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-muted px-4 py-2">
              <span className="text-sm text-muted-foreground animate-pulse">
                Thinking...
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex justify-center">
            <div className="rounded-lg bg-destructive/10 px-4 py-2">
              <p className="text-sm text-destructive">
                Error: {error.message || 'Something went wrong'}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t pt-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Write chat page**

```tsx
// next/app/(dashboard)/chat/page.tsx
'use client'

import dynamic from 'next/dynamic'

const ChatContainer = dynamic(
  () => import('@/components/chat/chat-container').then((mod) => ({ default: mod.ChatContainer })),
  { ssr: false },
)

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <ChatContainer />
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd next && npx next build 2>&1 | head -40`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add next/app/\(dashboard\)/chat/page.tsx next/components/chat/chat-container.tsx
git commit -m "feat(ui): add chat page with useChat and streaming"
```

---

### Task C5: Vault Page + Settings Page

**Files:**
- Create: `next/app/(dashboard)/vault/page.tsx`
- Create: `next/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Write vault page**

```tsx
// next/app/(dashboard)/vault/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { formatFileSize, formatDate } from '@/lib/utils'

interface VaultFile {
  id: string
  originalName: string
  size: number
  mimeType: string
  folder: string
  createdAt: string
}

export default function VaultPage() {
  const [files, setFiles] = useState<VaultFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/vault')
      .then((res) => res.json())
      .then((data) => setFiles(data.files || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vault</h1>
        <label className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Upload file
          <input
            type="file"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const formData = new FormData()
              formData.append('file', file)
              try {
                await fetch('/api/vault', { method: 'POST', body: formData })
                // Refresh file list
                const res = await fetch('/api/vault')
                const data = await res.json()
                setFiles(data.files || [])
              } catch (err) {
                console.error('Upload failed:', err)
              }
            }}
          />
        </label>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading files...</p>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No files yet</p>
          <p className="text-sm text-muted-foreground/60">
            Upload files for your agent to use
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Size</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm">{file.originalName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {file.mimeType}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(file.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write settings page**

```tsx
// next/app/(dashboard)/settings/page.tsx
'use client'

import { useAuth } from '@/app/providers'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <p className="text-sm text-muted-foreground">{user?.name || '—'}</p>
        </div>

        <div>
          <label className="text-sm font-medium">Email</label>
          <p className="text-sm text-muted-foreground">{user?.email || '—'}</p>
        </div>

        <div>
          <label className="text-sm font-medium">Role</label>
          <p className="text-sm text-muted-foreground capitalize">
            {user?.role || '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd next && npx next build 2>&1 | head -40`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add next/app/\(dashboard\)/vault/page.tsx next/app/\(dashboard\)/settings/page.tsx
git commit -m "feat(ui): add vault and settings pages"
```

---

### Task C6: Admin Dashboard + Dynamic Extension Page + Stores

**Files:**
- Create: `next/app/admin/page.tsx`
- Create: `next/app/ext/[name]/page.tsx`
- Create: `next/stores/auth-store.ts`
- Create: `next/stores/ui-store.ts`

- [ ] **Step 1: Write Zustand stores**

```typescript
// next/stores/auth-store.ts
import { create } from 'zustand'

interface AuthState {
  token: string | null
  setToken: (token: string | null) => void
  clearToken: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
  clearToken: () => set({ token: null }),
}))
```

```typescript
// next/stores/ui-store.ts
import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
```

- [ ] **Step 2: Write admin page**

```tsx
// next/app/admin/page.tsx
'use client'

import { useAuth } from '@/app/providers'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.push('/chat')
    }
  }, [user, loading, router])

  if (loading) return <p>Loading...</p>
  if (user?.role !== 'admin') return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground">Users</h2>
          <p className="text-2xl font-semibold">—</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground">Active Sessions</h2>
          <p className="text-2xl font-semibold">—</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground">Extensions</h2>
          <p className="text-2xl font-semibold">—</p>
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-medium">Extension Requests</h2>
        <p className="text-sm text-muted-foreground">
          No pending requests
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write dynamic extension page**

```tsx
// next/app/ext/[name]/page.tsx
'use client'

import { useParams } from 'next/navigation'

export default function ExtensionPage() {
  const params = useParams()
  const name = params.name as string

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold capitalize">
        Extension: {name.replace(/-/g, ' ')}
      </h1>
      <p className="text-muted-foreground">
        This extension page will be dynamically loaded from
        the extension&apos;s UI components.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `cd next && npx next build 2>&1 | head -50`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add next/app/admin/page.tsx next/app/ext/\[name\]/page.tsx next/stores/
git commit -m "feat(ui): add admin dashboard, extension pages, and Zustand stores"
```
