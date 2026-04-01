import { NextResponse } from 'next/server';
import { getAppBaseUrl } from '@/lib/app-url';
import { getToken } from 'next-auth/jwt';

const getCallbackScheme = () => {
  const scheme = process.env.MOBILE_AUTH_SCHEME?.trim();
  return scheme && scheme.length > 0 ? scheme : 'paytun';
};

export async function GET(request: Request) {
  const token = await getToken({ req: request, secret: process.env.SESSION_SECRET! });
  if (!token?.email) {
    const appBaseUrl = getAppBaseUrl();
    const signInUrl = new URL('/api/auth/signin', appBaseUrl);
    signInUrl.searchParams.set('provider', 'microsoft');
    const callbackUrl = new URL('/api/mobile/auth', appBaseUrl);
    signInUrl.searchParams.set('callbackUrl', callbackUrl.toString());
    return NextResponse.redirect(signInUrl);
  }

  const rawToken = await getToken({ req: request, secret: process.env.SESSION_SECRET!, raw: true });
  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redirectUrl = new URL(`${getCallbackScheme()}://auth`);
  redirectUrl.searchParams.set('token', String(rawToken));
  return NextResponse.redirect(redirectUrl);
}
