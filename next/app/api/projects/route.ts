import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { projectStore } from '@/lib/store'

function getTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|; )token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function GET(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) return new NextResponse('Unauthorized', { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET!)
    const projects = await projectStore.findByUserId(payload.sub)
    return NextResponse.json(projects)
  } catch (e) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
}

export async function POST(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) return new NextResponse('Unauthorized', { status: 401 })
  try {
    const payload = await verifyToken(token, process.env.JWT_SECRET!)
    const body = await req.json()
    const newProject = await projectStore.create({
      userId: payload.sub,
      name: body.name,
      instructions: body.instructions ?? '',
    })
    return NextResponse.json(newProject, { status: 201 })
  } catch (e) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
}
