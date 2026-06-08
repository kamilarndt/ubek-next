import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── mocks (must be top-level for hoisting) ───────────────────────────────────

const mockCookiesGet = vi.fn()
const mockCookiesSet = vi.fn()
const mockCookiesDelete = vi.fn()

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: mockCookiesGet,
    set: mockCookiesSet,
    delete: mockCookiesDelete,
  }),
}))

const mockDb: any = {
  select: vi.fn(),
  insert: vi.fn(),
}

vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}))

// ── helpers ──────────────────────────────────────────────────────────────────

/** Build a standard user row matching the DB schema */
function fakeUser(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? '00000000-0000-0000-0000-000000000001',
    email: overrides.email ?? 'alice@example.com',
    passwordHash: overrides.passwordHash ?? 'hashed',
    name: overrides.name ?? 'Alice',
    role: overrides.role ?? 'user',
    createdAt: overrides.createdAt ?? new Date(),
  }
}

// keep JWT_SECRET stable
process.env.JWT_SECRET = 'test-jwt-secret'

// ── tests ────────────────────────────────────────────────────────────────────

// ── register ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register a new user', async () => {
    const hashPassword = (await import('@/lib/auth')).hashPassword

    const newUser = fakeUser({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'new@example.com',
      name: 'New User',
      passwordHash: 'hashed-pw',
    })

    const pwHash = await hashPassword('password123')

    // simulate: no existing user
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    // simulate insert returning user
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...newUser, passwordHash: pwHash }]),
      }),
    })

    const { POST } = await import('../../../app/api/auth/register/route')
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com', password: 'password123', displayName: 'New User' }),
    })

    const res = await POST(req as any)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.user).toEqual({
      id: newUser.id,
      email: 'new@example.com',
      displayName: 'New User',
    })
  })

  it('should reject invalid email', async () => {
    const { POST } = await import('../../../app/api/auth/register/route')
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/email/i)
  })

  it('should reject password shorter than 8 chars', async () => {
    const { POST } = await import('../../../app/api/auth/register/route')
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'short' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/8 characters/i)
  })

  it('should return 409 when email already exists', async () => {
    const existing = fakeUser({ email: 'taken@example.com' })

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([existing]),
      }),
    })

    const { POST } = await import('../../../app/api/auth/register/route')
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'taken@example.com', password: 'password123' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already registered/i)
  })

  it('should reject missing email or password', async () => {
    const { POST } = await import('../../../app/api/auth/register/route')
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})

// ── login ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should login with valid credentials and set cookie', async () => {
    const hashPassword = (await import('@/lib/auth')).hashPassword

    const pwHash = await hashPassword('password123')
    const user = fakeUser({ passwordHash: pwHash })

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([user]),
      }),
    })

    const { POST } = await import('../../../app/api/auth/login/route')
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
    })

    const res = await POST(req as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.user).toEqual({
      id: user.id,
      email: user.email,
      displayName: user.name,
    })
    expect(mockCookiesSet).toHaveBeenCalledWith(
      'token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
    )
  })

  it('should reject wrong password', async () => {
    const hashPassword = (await import('@/lib/auth')).hashPassword

    const pwHash = await hashPassword('correct-password')
    const user = fakeUser({ passwordHash: pwHash })

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([user]),
      }),
    })

    const { POST } = await import('../../../app/api/auth/login/route')
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'wrong-password' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/invalid credentials/i)
  })

  it('should reject unknown email', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const { POST } = await import('../../../app/api/auth/login/route')
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'password123' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('should reject missing email or password', async () => {
    const { POST } = await import('../../../app/api/auth/login/route')
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})

// ── logout ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should clear the token cookie and return success', async () => {
    const { POST } = await import('../../../app/api/auth/logout/route')
    const req = new Request('http://localhost/api/auth/logout', { method: 'POST' })

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockCookiesDelete).toHaveBeenCalledWith('token')
  })
})

// ── me ───────────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return user for valid token', async () => {
    const signToken = (await import('@/lib/auth')).signToken
    const user = fakeUser()
    const token = await signToken({ sub: user.id, role: 'user' }, 'test-jwt-secret')

    mockCookiesGet.mockReturnValue({ value: token })
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([user]),
      }),
    })

    const { GET } = await import('../../../app/api/auth/me/route')
    const req = new Request('http://localhost/api/auth/me')

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.user).toEqual({
      id: user.id,
      email: user.email,
      displayName: user.name,
    })
  })

  it('should return 401 when no token cookie', async () => {
    mockCookiesGet.mockReturnValue(undefined)

    const { GET } = await import('../../../app/api/auth/me/route')
    const req = new Request('http://localhost/api/auth/me')

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('should return 401 for invalid token', async () => {
    mockCookiesGet.mockReturnValue({ value: 'totally-bogus-token' })

    const { GET } = await import('../../../app/api/auth/me/route')
    const req = new Request('http://localhost/api/auth/me')

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('should return 404 when user not found', async () => {
    const signToken = (await import('@/lib/auth')).signToken
    const token = await signToken(
      { sub: 'nonexistent-id', role: 'user' },
      'test-jwt-secret',
    )

    mockCookiesGet.mockReturnValue({ value: token })
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const { GET } = await import('../../../app/api/auth/me/route')
    const req = new Request('http://localhost/api/auth/me')

    const res = await GET()
    expect(res.status).toBe(404)
  })
})
