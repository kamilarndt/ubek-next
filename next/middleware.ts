import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkAuth, PROTECTED_ROUTES, PUBLIC_ROUTES } from '@/lib/middleware-utils'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  const isProtected = !isPublic && PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  const { isAuthenticated } = await checkAuth(request)

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Match all routes
// This is required for Next.js middleware to work
// See: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}