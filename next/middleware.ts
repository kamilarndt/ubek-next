import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkAuth, PROTECTED_ROUTES, PUBLIC_ROUTES } from '@/lib/middleware-utils'
import { csrfMiddleware, setCsrfCookie } from '@/lib/csrf'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CSRF check for mutating API routes (skip health, auth routes)
  const skipCsrfPaths = ['/api/health', '/api/auth/login', '/api/auth/register'];
  if (pathname.startsWith('/api/') && !skipCsrfPaths.some(p => pathname.startsWith(p)) && (!pathname.startsWith('/api/auth/') || pathname === '/api/auth/logout')) {
    const csrfResult = csrfMiddleware(request)
    if (csrfResult) return csrfResult
  }

  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  const isProtected = !isPublic && PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  const { isAuthenticated } = await checkAuth(request)

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const response = NextResponse.next()
  // Set CSRF cookie on page navigations
  if (!pathname.startsWith('/api/')) {
    setCsrfCookie(response)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}