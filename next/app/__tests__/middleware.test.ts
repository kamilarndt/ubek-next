import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Mock next/server before importing the module under test
const mockRedirect = vi.fn()
const mockNext = vi.fn()

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: (...args: unknown[]) => {
        mockRedirect(...args)
        return { type: 'redirect' }
      },
      next: (...args: unknown[]) => {
        mockNext(...args)
        return { type: 'next' }
      },
    },
  }
})

vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}))

// Import after mocks are set up
import { checkAuth, PROTECTED_ROUTES, PUBLIC_ROUTES } from '@/lib/middleware-utils'
import { verifyToken } from '@/lib/auth'

const mockedVerifyToken = vi.mocked(verifyToken)

function createRequest(url: string, token?: string): NextRequest {
  const req = new NextRequest(new URL(url))
  if (token) {
    req.cookies.set('token', token)
  }
  return req
}

describe('checkAuth', () => {
  const testSecret = 'test-secret-key'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = testSecret
  })

  it('returns userId for valid token', async () => {
    mockedVerifyToken.mockResolvedValue({ sub: 'user-123' })
    const request = createRequest('http://localhost/', 'valid-token')

    const result = await checkAuth(request)

    expect(result.isAuthenticated).toBe(true)
    expect(result.userId).toBe('user-123')
    expect(mockedVerifyToken).toHaveBeenCalledWith('valid-token', testSecret)
  })

  it('returns isAuthenticated false when no token cookie', async () => {
    const request = createRequest('http://localhost/')

    const result = await checkAuth(request)

    expect(result.isAuthenticated).toBe(false)
    expect(result.userId).toBeUndefined()
    expect(mockedVerifyToken).not.toHaveBeenCalled()
  })

  it('returns isAuthenticated false for invalid token', async () => {
    mockedVerifyToken.mockRejectedValue(new Error('invalid token'))
    const request = createRequest('http://localhost/', 'bad-token')

    const result = await checkAuth(request)

    expect(result.isAuthenticated).toBe(false)
    expect(result.userId).toBeUndefined()
  })

  it('returns isAuthenticated false when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET
    const request = createRequest('http://localhost/', 'some-token')

    const result = await checkAuth(request)

    expect(result.isAuthenticated).toBe(false)
    expect(result.userId).toBeUndefined()
  })
})

describe('Route constants', () => {
  it('PROTECTED_ROUTES contains expected paths', () => {
    expect(PROTECTED_ROUTES).toEqual(['/', '/api/chat', '/api/projects', '/api/vault'])
  })

  it('PUBLIC_ROUTES contains expected paths', () => {
    expect(PUBLIC_ROUTES).toEqual(['/login', '/register', '/api/auth'])
  })
})

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-key'
  })

  it('redirects unauthenticated user to /login for protected route', async () => {
    mockedVerifyToken.mockRejectedValue(new Error('no token'))

    // Dynamic import to get fresh module with mocks applied
    const { middleware } = await import('@/middleware')
    const request = createRequest('http://localhost/api/chat/stream')

    await middleware(request)

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/login' })
    )
  })

  it('allows unauthenticated user on public route', async () => {
    mockedVerifyToken.mockRejectedValue(new Error('no token'))

    const { middleware } = await import('@/middleware')
    const request = createRequest('http://localhost/login')

    await middleware(request)

    expect(mockNext).toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('allows authenticated user on protected route', async () => {
    mockedVerifyToken.mockResolvedValue({ sub: 'user-123' })

    const { middleware } = await import('@/middleware')
    const request = createRequest('http://localhost/api/chat/stream', 'valid-token')

    await middleware(request)

    expect(mockNext).toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redirects authenticated user away from /login to /', async () => {
    mockedVerifyToken.mockResolvedValue({ sub: 'user-123' })

    const { middleware } = await import('@/middleware')
    const request = createRequest('http://localhost/login', 'valid-token')

    await middleware(request)

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/' })
    )
  })
})
