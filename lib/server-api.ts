import { cookies, headers } from 'next/headers';
import { getAppBaseUrl } from '@/lib/app-url';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const buildApiUrl = (path: string, origin: string) => new URL(path, origin).toString();

const resolveRequestOrigin = () => getAppBaseUrl().toString();

export const fetchServerApi = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const requestHeaders = new Headers(options.headers);
  const origin = resolveRequestOrigin();
  const appBaseUrl = getAppBaseUrl();
  if (!requestHeaders.has('x-forwarded-proto')) {
    requestHeaders.set('x-forwarded-proto', appBaseUrl.protocol.replace(':', ''));
  }
  if (!requestHeaders.has('x-forwarded-host')) {
    requestHeaders.set('x-forwarded-host', appBaseUrl.host);
  }
  const rawCookieHeader = headerStore.get('cookie') ?? '';
  const cookieHeader = rawCookieHeader
    ? rawCookieHeader
    : cookieStore
        .getAll()
        .map(({ name, value }) => `${name}=${value}`)
        .join('; ');
  if (cookieHeader) {
    requestHeaders.set('cookie', cookieHeader);
  }

  const response = await fetch(buildApiUrl(path, origin), {
    ...options,
    headers: requestHeaders,
    cache: 'no-store',
  });

  const rawBody = await response.text().catch(() => '');

  if (!response.ok) {
    throw new ApiError(response.status, rawBody || `Request failed with ${response.status}`);
  }

  if (!rawBody) {
    throw new ApiError(response.status, `Empty response body for ${path}`);
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new ApiError(response.status, `Expected JSON response from ${path}`);
  }
};
