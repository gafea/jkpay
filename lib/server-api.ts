import { cookies } from 'next/headers';
import { getAppBaseUrl } from '@/lib/app-url';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const buildApiUrl = (path: string) => new URL(path, getAppBaseUrl()).toString();

export const fetchServerApi = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const cookieStore = cookies();
  const headers = new Headers(options.headers);
  const cookieHeader = cookieStore.toString();
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
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
