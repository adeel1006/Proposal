import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicProposalActionRoute =
    pathname.startsWith('/api/proposals/accept') ||
    pathname.startsWith('/api/proposals/decline') ||
    pathname.startsWith('/api/proposals/generate-pdf');
  
  // Skip middleware for public routes
  if (pathname === '/login' || pathname.startsWith('/api/auth') || isPublicProposalActionRoute) {
    return NextResponse.next();
  }

  // Check authentication
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = authCookie === AUTH_COOKIE_VALUE;

  // If not authenticated and trying to access protected routes, redirect to login
  if (!isAuthenticated && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|public|Favicon-proposals.png|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)'],
};
