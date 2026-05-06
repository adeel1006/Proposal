import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

function buildLogoutResponse(request: NextRequest) {
  // Redirect after logout so the browser doesn't land on a JSON endpoint.
  const redirectUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function POST(request: NextRequest) {
  return buildLogoutResponse(request);
}

export async function GET(request: NextRequest) {
  return buildLogoutResponse(request);
}
