import { auth } from '@/auth';
import { getAppBaseUrl } from '@/lib/app-url';
import { NextResponse } from 'next/server';

const isPublicPath = (pathname: string) => pathname === '/';

const isStaticOrAuthRoute = (pathname: string) => {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico'
  );
};

export default auth((request) => {
  const { pathname } = request.nextUrl;

  if (isStaticOrAuthRoute(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!request.auth?.user) {
    const appBaseUrl = getAppBaseUrl();
    const signInUrl = new URL('/api/auth/signin/microsoft', appBaseUrl);
    const callbackUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, appBaseUrl);
    signInUrl.searchParams.set('callbackUrl', callbackUrl.toString());
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
};
