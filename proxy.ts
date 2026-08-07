import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function hasUnexpiredToken(token: string) {
  try {
    const [, encodedPayload] = token.split('.');
    if (!encodedPayload) return false;

    const base64 = encodedPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    const payload = JSON.parse(atob(base64)) as { exp?: number };

    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Exclude static assets, next internals, and public paths if any
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/static') ||
    path.includes('.') // likely a file (favicon.ico, etc)
  ) {
    return NextResponse.next();
  }

  const pbAuth = request.cookies.get('pb_auth');
  const hasAuthCookie = !!pbAuth?.value;
  const isLoggedIn = hasAuthCookie && hasUnexpiredToken(pbAuth.value);

  // The login page is also the session recovery point. Always remove any
  // existing server cookie so revoked tokens and legacy cookie formats cannot
  // survive a redirect back to login.
  if (path === '/login') {
    const response = NextResponse.next();
    if (hasAuthCookie) {
      response.cookies.delete('pb_auth');
    }
    return response;
  }

  // Allow access to home page and login page for unauthenticated users
  if (!isLoggedIn && path !== '/') {
    const loginUrl = new URL('/login', request.url);
    // Optional: Add ?next=path to redirect back after login
    // loginUrl.searchParams.set('next', path);
    const response = NextResponse.redirect(loginUrl);
    if (hasAuthCookie) {
      response.cookies.delete('pb_auth');
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
