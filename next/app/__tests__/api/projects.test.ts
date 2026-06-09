import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '../../api/projects/route'
import { GET as GET_ID, PATCH as PATCH_ID, DELETE as DELETE_ID } from '../../api/projects/[id]/route'
import { projectStore } from '@/lib/store'
import { verifyToken } from '@/lib/auth'

vi.mock('@/lib/store', () => ({
  projectStore: {
    findByUserId: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}))

const mockUserId = 'user-123'
const mockToken = 'valid-token'

beforeEach(() => {
  vi.resetAllMocks()
  ;(verifyToken as any).mockResolvedValue({ sub: mockUserId })
})

describe('GET /api/projects', () => {
  it('returns projects for authenticated user', async () => {
    const mockProjects = [{ id: 'p1', name: 'proj' }]
    ;(projectStore.findByUserId as any).mockResolvedValue(mockProjects)
    const req = new Request('http://localhost/api/projects', { headers: { cookie: `token=${mockToken}` } })
    const resp = await GET(req)
    expect(resp.status).toBe(200)
    const data = await resp.json()
    expect(data).toEqual(mockProjects)
  })

  it('returns empty array when no projects', async () => {
    ;(projectStore.findByUserId as any).mockResolvedValue([])
    const req = new Request('http://localhost/api/projects', { headers: { cookie: `token=${mockToken}` } })
    const resp = await GET(req)
    expect(resp.status).toBe(200)
    const data = await resp.json()
    expect(data).toEqual([])
  })
})

describe('POST /api/projects', () => {
  it('creates project with valid auth', async () => {
    const newProj = { id: 'p2', name: 'new', userId: mockUserId }
    ;(projectStore.create as any).mockResolvedValue(newProj)
    const body = JSON.stringify({ name: 'new' })
    const req = new Request('http://localhost/api/projects', { method: 'POST', body, headers: { 'content-type': 'application/json', cookie: `token=${mockToken}` } })
    const resp = await POST(req)
    expect(resp.status).toBe(201)
    const data = await resp.json()
    expect(data).toEqual(newProj)
  })

  it('returns 401 without auth', async () => {
    const req = new Request('http://localhost/api/projects', { method: 'POST', body: JSON.stringify({ name: 'x' }), headers: { 'content-type': 'application/json' } })
    const resp = await POST(req)
    expect(resp.status).toBe(401)
  })
})

describe('GET /api/projects/[id]', () => {
  it('returns project for owner', async () => {
    const proj = { id: 'p1', userId: mockUserId, name: 'proj' }
    ;(projectStore.findById as any).mockResolvedValue(proj)
    const req = new Request('http://localhost/api/projects/p1', { headers: { cookie: `token=${mockToken}` } })
    const resp = await GET_ID(req, { params: { id: 'p1' } } as any)
    expect(resp.status).toBe(200)
    const data = await resp.json()
    expect(data).toEqual(proj)
  })

  it('returns 404 for wrong user', async () => {
    const proj = { id: 'p1', userId: 'other', name: 'proj' }
    ;(projectStore.findById as any).mockResolvedValue(proj)
    const req = new Request('http://localhost/api/projects/p1', { headers: { cookie: `token=${mockToken}` } })
    const resp = await GET_ID(req, { params: { id: 'p1' } } as any)
    expect(resp.status).toBe(404)
  })
})

describe('PATCH /api/projects/[id]', () => {
  it('updates project for owner', async () => {
    const proj = { id: 'p1', userId: mockUserId, name: 'old' }
    ;(projectStore.findById as any).mockResolvedValue(proj)
    const updated = { ...proj, name: 'new' }
    ;(projectStore.update as any).mockResolvedValue(updated)
    const req = new Request('http://localhost/api/projects/p1', { method: 'PATCH', body: JSON.stringify({ name: 'new' }), headers: { 'content-type': 'application/json', cookie: `token=${mockToken}` } })
    const resp = await PATCH_ID(req, { params: { id: 'p1' } } as any)
    expect(resp.status).toBe(200)
    const data = await resp.json()
    expect(data).toEqual(updated)
  })
})

describe('DELETE /api/projects/[id]', () => {
  it('deletes project for owner', async () => {
    const proj = { id: 'p1', userId: mockUserId }
    ;(projectStore.findById as any).mockResolvedValue(proj)
    ;(projectStore.delete as any).mockResolvedValue(undefined)
    const req = new Request('http://localhost/api/projects/p1', { method: 'DELETE', headers: { cookie: `token=${mockToken}` } })
    const resp = await DELETE_ID(req, { params: { id: 'p1' } } as any)
    expect(resp.status).toBe(204)
  })

  it('returns 401 without auth', async () => {
    const req = new Request('http://localhost/api/projects/p1', { method: 'DELETE' })
    const resp = await DELETE_ID(req, { params: { id: 'p1' } } as any)
    expect(resp.status).toBe(401)
  })
})
