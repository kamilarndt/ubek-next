import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUser = {
  id: 'u1',
  email: 'test@example.com',
  passwordHash: 'hash123',
  name: 'Test',
  role: 'user',
  createdAt: new Date('2026-01-01'),
}

const mockProject = {
  id: 'p1',
  userId: 'u1',
  name: 'Test Project',
  instructions: '',
  icon: 'gem',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const mockSession = {
  id: 's1',
  userId: 'u1',
  projectId: 'p1',
  title: 'Nowa rozmowa',
  messages: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const mockVaultFile = {
  id: 'v1',
  userId: 'u1',
  projectId: null,
  filename: 'doc.txt',
  originalName: 'doc.txt',
  size: 100,
  mimeType: 'text/plain',
  folder: '/',
  createdAt: new Date('2026-01-01'),
  deletedAt: null,
}

function selectChain(result: unknown[], hasLimit = true) {
  const whereReturn = hasLimit
    ? { limit: vi.fn(() => Promise.resolve(result)) }
    : Promise.resolve(result)
  return { from: vi.fn(() => ({ where: vi.fn(() => whereReturn) })) }
}

function returningChain(result: unknown) {
  return { values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([result])) })) }
}

function updateChain(result: unknown) {
  return { set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([result])) })) })) }
}

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const { db } = await import('@/lib/db')
const { userStore, projectStore, sessionStore, vaultStore } = await import('@/lib/store')

describe('userStore', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('findById returns user', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([mockUser]) as never)
    const result = await userStore.findById('u1')
    expect(result).toEqual(mockUser)
  })

  it('findById returns null when not found', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([]) as never)
    const result = await userStore.findById('missing')
    expect(result).toBeNull()
  })

  it('findByEmail returns user', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([mockUser]) as never)
    const result = await userStore.findByEmail('test@example.com')
    expect(result).toEqual(mockUser)
  })

  it('create inserts and returns user', async () => {
    vi.mocked(db.insert).mockReturnValue(returningChain(mockUser) as never)
    const result = await userStore.create({ email: 'a@b.com', passwordHash: 'hash' })
    expect(result).toEqual(mockUser)
  })
})

describe('projectStore', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('findById returns project', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([mockProject]) as never)
    const result = await projectStore.findById('p1')
    expect(result).toEqual(mockProject)
  })

  it('findByUserId returns projects (no limit)', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([mockProject], false) as never)
    const result = await projectStore.findByUserId('u1')
    expect(result).toEqual([mockProject])
  })

  it('create inserts project', async () => {
    vi.mocked(db.insert).mockReturnValue(returningChain(mockProject) as never)
    const result = await projectStore.create({ userId: 'u1', name: 'P' })
    expect(result).toEqual(mockProject)
  })
})

describe('sessionStore', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('findById returns session', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([mockSession]) as never)
    const result = await sessionStore.findById('s1')
    expect(result).toEqual(mockSession)
  })

  it('findByProjectId returns sessions (no limit)', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([mockSession], false) as never)
    const result = await sessionStore.findByProjectId('p1')
    expect(result).toEqual([mockSession])
  })

  it('create inserts session', async () => {
    vi.mocked(db.insert).mockReturnValue(returningChain(mockSession) as never)
    const result = await sessionStore.create({ id: 's1', userId: 'u1', projectId: 'p1' })
    expect(result).toEqual(mockSession)
  })

  it('update modifies session title', async () => {
    vi.mocked(db.update).mockReturnValue(updateChain(mockSession) as never)
    const result = await sessionStore.update('s1', { title: 'New Title' })
    expect(result).toEqual(mockSession)
  })
})

describe('vaultStore', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('findById returns file', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([mockVaultFile]) as never)
    const result = await vaultStore.findById('v1')
    expect(result).toEqual(mockVaultFile)
  })

  it('findByUserId returns files (no limit)', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([mockVaultFile], false) as never)
    const result = await vaultStore.findByUserId('u1')
    expect(result).toEqual([mockVaultFile])
  })

  it('findByProjectId returns files (no limit)', async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([mockVaultFile], false) as never)
    const result = await vaultStore.findByProjectId('p1')
    expect(result).toEqual([mockVaultFile])
  })

  it('create inserts file', async () => {
    vi.mocked(db.insert).mockReturnValue(returningChain(mockVaultFile) as never)
    const result = await vaultStore.create({ userId: 'u1', filename: 'f.txt', originalName: 'f.txt' })
    expect(result).toEqual(mockVaultFile)
  })
})
