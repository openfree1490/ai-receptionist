import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'admin_auth'
const LOGIN_PATH  = '/admin/login'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin routes; skip the login page itself
  if (!pathname.startsWith('/admin') || pathname === LOGIN_PATH) {
    return NextResponse.next()
  }

  const cookie   = request.cookies.get(COOKIE_NAME)
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    // ADMIN_PASSWORD not configured — block access entirely
    return new NextResponse('Admin password not configured.', { status: 503 })
  }

  if (cookie?.value === expected) {
    return NextResponse.next()
  }

  // Not authenticated — redirect to login, preserving the intended destination
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = LOGIN_PATH
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
