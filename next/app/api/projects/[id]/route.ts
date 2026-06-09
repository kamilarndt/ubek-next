import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { projectStore } from '@/lib/store'

function getTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|; )token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const token = getTokenFromRequest(req)
  if (!token) return new NextResponse('Unauthorized', { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET!)
    const project = await projectStore.findById(id)
    if (!project || project.userId !== payload.sub) return new NextResponse('Not Found', { status: 404 })
    return NextResponse.json(project)
  } catch (e) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const token = getTokenFromRequest(req)
  if (!token) return new NextResponse('Unauthorized', { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET!)
    const existing = await projectStore.findById(id)
    if (!existing || existing.userId !== payload.sub) return new NextResponse('Not Found', { status: 404 })
    const body = await req.json()
    const updated = await projectStore.update(id, { name: body.name, instructions: body.instructions })
    return NextResponse.json(updated)
  } catch (e) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const token = getTokenFromRequest(req)
  if (!token) return new NextResponse('Unauthorized', { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET!)
    const existing = await projectStore.findById(id)
    if (!existing || existing.userId !== payload.sub) return new NextResponse('Not Found', { status: 404 })
    await projectStore.delete(id)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
}
