import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  const isLoggedIn = !!pbAuth?.value;

  // Allow access to home page and login page for unauthenticated users
  if (!isLoggedIn && path !== '/login' && path !== '/') {
    const loginUrl = new URL('/login', request.url);
    // Optional: Add ?next=path to redirect back after login
    // loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
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
