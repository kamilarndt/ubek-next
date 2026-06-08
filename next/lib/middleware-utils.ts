import { NextRequest } from 'next/server'
import { verifyToken, TokenPayload } from '@/lib/auth'

export interface AuthCheckResult {
  isAuthenticated: boolean
  userId?: string
}

export async function checkAuth(request: NextRequest): Promise<AuthCheckResult> {
  const token = request.cookies.get('token')?.value
  if (!token) {
    return { isAuthenticated: false }
  }
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET not configured')
    }
    const payload = (await verifyToken(token, secret)) as TokenPayload
    return { isAuthenticated: true, userId: payload.sub }
  } catch (err) {
    return { isAuthenticated: false }
  }
}

export const PROTECTED_ROUTES = ['/', '/api/chat', '/api/projects', '/api/vault']
export const PUBLIC_ROUTES = ['/login', '/register', '/api/auth']
