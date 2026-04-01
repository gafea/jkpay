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

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new ApiError(response.status, message || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
};
