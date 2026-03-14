import { NextResponse, type NextRequest } from 'next/server';
import { auth } from './lib/auth';
import { headers } from 'next/headers';

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register');

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/pos') ||
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/profile') ||
    request.nextUrl.pathname.startsWith('/categories') ||
    request.nextUrl.pathname.startsWith('/products') ||
    request.nextUrl.pathname.startsWith('/materials') ||
    request.nextUrl.pathname.startsWith('/product-inventories') ||
    request.nextUrl.pathname.startsWith('/material-inventories') ||
    request.nextUrl.pathname.startsWith('/inventory') ||
    request.nextUrl.pathname.startsWith('/recipes') ||
    request.nextUrl.pathname.startsWith('/production-orders') ||
    request.nextUrl.pathname.startsWith('/locations') ||
    request.nextUrl.pathname.startsWith('/users') ||
    request.nextUrl.pathname.startsWith('/settings');

  // Redirect root path to POS
  if (request.nextUrl.pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/pos', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/pos', request.url));
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
