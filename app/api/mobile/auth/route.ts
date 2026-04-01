import { NextResponse } from 'next/server';
import { getAppBaseUrl } from '@/lib/app-url';
import { getToken } from 'next-auth/jwt';

const resolveRequestProto = (request: Request) => {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim().toLowerCase() ?? '';
  }

  try {
    return new URL(request.url).protocol.replace(':', '').toLowerCase();
  } catch {
    return '';
  }
};

export async function GET(request: Request) {
  const secureCookie = resolveRequestProto(request) === 'https';
  const token = await getToken({ req: request, secret: process.env.SESSION_SECRET!, secureCookie });
  if (!token?.email) {
    const appBaseUrl = getAppBaseUrl();
    const signInUrl = new URL('/', appBaseUrl);
    const callbackUrl = new URL('/api/mobile/auth', appBaseUrl);
    signInUrl.searchParams.set('autoredirect', '1');
    signInUrl.searchParams.set('callbackUrl', callbackUrl.toString());
    return NextResponse.redirect(signInUrl);
  }

  const rawToken = await getToken({
    req: request,
    secret: process.env.SESSION_SECRET!,
    raw: true,
    secureCookie,
  });
  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redirectUrl = new URL(`paytun://auth`);
  redirectUrl.searchParams.set('token', String(rawToken));
  return NextResponse.redirect(redirectUrl);
}
